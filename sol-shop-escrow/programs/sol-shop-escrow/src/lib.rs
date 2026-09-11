use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("J6oeUYbGXSdKyH4d1YhtHoCuEA79d9FQurmsim82KN5A");

pub const STATUS_CREATED: u8 = 0;
pub const STATUS_DEPOSITS_COMPLETE: u8 = 1;
pub const STATUS_FINALIZATION_SUGGESTED: u8 = 2;
pub const STATUS_COMPLETED: u8 = 3;

pub const DONATION_RECIPIENT: Pubkey = pubkey!("61Gt8siRo84pmGziia5dHuJMkx9ne1d4Cb5aHsyQGP85");

#[program]
pub mod sol_shop_escrow {
    use super::*;

    pub fn create_escrow(
        ctx: Context<CreateEscrow>,
        _escrow_id: u64,
        escrow_type: u8,
        party_a: Pubkey,
        party_b: Pubkey,
        reference_amount: u64,
        required_deposit_a: u64,
        required_deposit_b: u64,
        note: String,
    ) -> Result<()> {
        require!(required_deposit_a > 0, EscrowError::InvalidAmount);
        require!(required_deposit_b > 0, EscrowError::InvalidAmount);
        require!(note.len() <= 200, EscrowError::NoteTooLong);

        let creator = ctx.accounts.creator.key();

        require!(
            creator == party_a || creator == party_b,
            EscrowError::CreatorMustBeParty
        );

        require!(
            party_a != Pubkey::default() || party_b != Pubkey::default(),
            EscrowError::InvalidParty
        );

        require!(reference_amount > 0, EscrowError::InvalidAmount);

        if party_a != Pubkey::default() && party_b != Pubkey::default() {
            require!(party_a != party_b, EscrowError::InvalidParty);
        }

        let escrow = &mut ctx.accounts.escrow;

        escrow.creator = creator;
        escrow.party_a = party_a;
        escrow.party_b = party_b;

        escrow.escrow_type = escrow_type;

        escrow.required_deposit_a = required_deposit_a;
        escrow.required_deposit_b = required_deposit_b;

        escrow.deposited_a = 0;
        escrow.deposited_b = 0;

        escrow.proposed_payout_a = 0;
        escrow.proposed_payout_b = 0;
        escrow.finalization_proposer = Pubkey::default();
        escrow.finalization_note = String::new();

        escrow.reference_amount = reference_amount;
        escrow.proposed_donation = 0;

        escrow.vault = ctx.accounts.vault.key();
        escrow.status = STATUS_CREATED;

        escrow.created_at = Clock::get()?.unix_timestamp;
        escrow.deposit_at = 0;
        escrow.finalized_at = 0;

        escrow.note = note;

        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        require!(amount > 0, EscrowError::InvalidAmount);

        let escrow = &mut ctx.accounts.escrow;
        let depositor = ctx.accounts.depositor.key();

        require!(escrow.status == STATUS_CREATED, EscrowError::InvalidStatus);
        require_keys_eq!(
            escrow.vault,
            ctx.accounts.vault.key(),
            EscrowError::InvalidVault
        );

        let is_party_a = if depositor == escrow.party_a {
            true
        } else if depositor == escrow.party_b {
            false
        } else if escrow.party_a == Pubkey::default() && depositor != escrow.party_b {
            escrow.party_a = depositor;
            true
        } else if escrow.party_b == Pubkey::default() && depositor != escrow.party_a {
            escrow.party_b = depositor;
            false
        } else {
            return err!(EscrowError::Unauthorized);
        };

        if is_party_a {
            require!(escrow.deposited_a == 0, EscrowError::AlreadyDeposited);
            require!(
                amount == escrow.required_deposit_a,
                EscrowError::InvalidDepositAmount
            );

            escrow.deposited_a = amount;
        } else {
            require!(escrow.deposited_b == 0, EscrowError::AlreadyDeposited);
            require!(
                amount == escrow.required_deposit_b,
                EscrowError::InvalidDepositAmount
            );

            escrow.deposited_b = amount;
        }

        let cpi_accounts = system_program::Transfer {
            from: ctx.accounts.depositor.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            cpi_accounts,
        );

        system_program::transfer(cpi_ctx, amount)?;

        if escrow.deposited_a == escrow.required_deposit_a
            && escrow.deposited_b == escrow.required_deposit_b
        {
            escrow.status = STATUS_DEPOSITS_COMPLETE;
            escrow.deposit_at = Clock::get()?.unix_timestamp;
        }

        Ok(())
    }


    pub fn withdraw_before_complete(ctx: Context<WithdrawBeforeComplete>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        let withdrawer = ctx.accounts.withdrawer.key();

        require!(
            escrow.status == STATUS_CREATED, 
            EscrowError::InvalidStatus
        );
        require_keys_eq!(
            escrow.vault,
            ctx.accounts.vault.key(),
            EscrowError::InvalidVault
        );
        require_keys_eq!(
            ctx.accounts.creator.key(),
            escrow.creator,
            EscrowError::Unauthorized
        );

        let amount = if withdrawer == escrow.party_a {
            require!(escrow.deposited_a > 0, EscrowError::NothingToWithdraw);
            let amount = escrow.deposited_a;
            escrow.deposited_a = 0;
            amount
        } else if withdrawer == escrow.party_b {
            require!(escrow.deposited_b > 0, EscrowError::NothingToWithdraw);
            let amount = escrow.deposited_b;
            escrow.deposited_b = 0;
            amount
        } else {
            return err!(EscrowError::Unauthorized);
        };

        **ctx.accounts.vault.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.withdrawer.to_account_info().try_borrow_mut_lamports()? += amount;

        let remaining_lamports = ctx.accounts.vault.to_account_info().lamports();

        if remaining_lamports > 0 {
            **ctx.accounts
                .vault
                .to_account_info()
                .try_borrow_mut_lamports()? -= remaining_lamports;

            **ctx.accounts
                .creator
                .to_account_info()
                .try_borrow_mut_lamports()? += remaining_lamports;
        }

        Ok(())
    }

    pub fn suggest_finalization(
        ctx: Context<SuggestFinalization>,
        payout_a: u64,
        payout_b: u64,
        proposed_donation: u64,
        finalization_note: String,
    ) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        let signer = ctx.accounts.signer.key();

        require!(
            escrow.status == STATUS_DEPOSITS_COMPLETE,
            EscrowError::InvalidStatus
        );

        require!(
            signer == escrow.party_a || signer == escrow.party_b,
            EscrowError::Unauthorized
        );

        require!(finalization_note.len() <= 200, EscrowError::NoteTooLong);

        let total_locked = escrow.deposited_a 
            .checked_add(escrow.deposited_b)
            .ok_or(EscrowError::InvalidFinalization)?;

        let total_payout = payout_a
            .checked_add(payout_b)
            .and_then(|total| total.checked_add(proposed_donation))
            .ok_or(EscrowError::InvalidFinalization)?;

        require!(total_payout == total_locked, EscrowError::InvalidFinalization);

        require!(
            proposed_donation <= escrow.reference_amount,
            EscrowError::InvalidDonation
        );

        escrow.proposed_payout_a = payout_a;
        escrow.proposed_payout_b = payout_b;
        escrow.proposed_donation = proposed_donation;
        escrow.finalization_proposer = signer;
        escrow.finalization_note = finalization_note;

        escrow.status = STATUS_FINALIZATION_SUGGESTED;

        Ok(())
    }

    pub fn accept_finalization(
        ctx: Context<AcceptFinalization>,
    ) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        let signer = ctx.accounts.signer.key();

        require!(
            escrow.status == STATUS_FINALIZATION_SUGGESTED,
            EscrowError::InvalidStatus
        );

        require!(
            signer == escrow.party_a || signer == escrow.party_b,
            EscrowError::Unauthorized
        );

        require!(
            signer != escrow.finalization_proposer,
            EscrowError::CannotAcceptOwnFinalization
        );

        let payout_a = escrow.proposed_payout_a;
        let payout_b = escrow.proposed_payout_b;

        let donation = escrow.proposed_donation;

        require_keys_eq!(
            ctx.accounts.party_a.key(),
            escrow.party_a,
            EscrowError::Unauthorized
        );

        require_keys_eq!(
            ctx.accounts.party_b.key(),
            escrow.party_b,
            EscrowError::Unauthorized
        );

        **ctx.accounts.vault.to_account_info().try_borrow_mut_lamports()? -= payout_a;
        **ctx.accounts.party_a.to_account_info().try_borrow_mut_lamports()? += payout_a;

        **ctx.accounts.vault.to_account_info().try_borrow_mut_lamports()? -= payout_b;
        **ctx.accounts.party_b.to_account_info().try_borrow_mut_lamports()? += payout_b;

        **ctx.accounts.vault.to_account_info().try_borrow_mut_lamports()? -= donation;
        **ctx.accounts.donation_recipient.to_account_info().try_borrow_mut_lamports()? += donation;

        escrow.status = STATUS_COMPLETED;
        escrow.finalized_at = Clock::get()?.unix_timestamp;

        Ok(())
    }

    pub fn reject_finalization(
        ctx: Context<RejectFinalization>,
    ) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        let signer = ctx.accounts.signer.key();

        require!(
            escrow.status == STATUS_FINALIZATION_SUGGESTED,
            EscrowError::InvalidStatus
        );

        require!(
            signer == escrow.party_a || signer == escrow.party_b,
            EscrowError::Unauthorized
        );

        require!(
            signer != escrow.finalization_proposer,
            EscrowError::CannotRejectOwnFinalization
        );

        escrow.proposed_payout_a = 0;
        escrow.proposed_payout_b = 0;
        escrow.finalization_proposer = Pubkey::default();
        escrow.finalization_note = String::new();
        escrow.proposed_donation = 0;

        escrow.status = STATUS_DEPOSITS_COMPLETE;

        Ok(())
    }


    pub fn close_completed_escrow(ctx: Context<CloseCompletedEscrow>) -> Result<()> {
        let escrow = &ctx.accounts.escrow;

        require!(
            escrow.status == STATUS_COMPLETED,
            EscrowError::InvalidStatus
        );

        require_keys_eq!(
            ctx.accounts.creator.key(),
            escrow.creator,
            EscrowError::Unauthorized
        );

        require_keys_eq!(
            escrow.vault,
            ctx.accounts.vault.key(),
            EscrowError::InvalidVault
        );

        let vault_lamports = ctx.accounts.vault.to_account_info().lamports();

        if vault_lamports > 0 {
            **ctx.accounts.vault.to_account_info().try_borrow_mut_lamports()? -= vault_lamports;
            **ctx.accounts.creator.to_account_info().try_borrow_mut_lamports()? += vault_lamports;
        }

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(escrow_id: u64)]
pub struct CreateEscrow<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        init,
        payer = creator,
        space = 8 + Escrow::INIT_SPACE,
        seeds = [
            b"escrow",
            creator.key().as_ref(),
            &escrow_id.to_le_bytes()
        ],
        bump
    )]
    pub escrow: Account<'info, Escrow>,

    #[account(
        init,
        payer = creator,
        space = 0,
        seeds = [
            b"vault",
            escrow.key().as_ref()
        ],
        bump,
    )]
    /// CHECK: program-owned PDA vault for holding SOL
    pub vault: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub depositor: Signer<'info>,

    #[account(mut)]
    pub escrow: Account<'info, Escrow>,

    #[account(
        mut,
        seeds = [
            b"vault",
            escrow.key().as_ref()
        ],
        bump
    )]
    /// CHECK: program-owned PDA vault for holding SOL
    pub vault: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct Escrow {
    pub creator: Pubkey,

    pub party_a: Pubkey,
    pub party_b: Pubkey,

    pub escrow_type: u8,

    pub required_deposit_a: u64,
    pub required_deposit_b: u64,

    pub deposited_a: u64,
    pub deposited_b: u64,

    pub proposed_payout_a: u64,
    pub proposed_payout_b: u64,
    pub finalization_proposer: Pubkey,

    #[max_len(200)]
    pub finalization_note: String,

    pub vault: Pubkey,
    pub status: u8,

    pub created_at: i64,
    pub deposit_at: i64,
    pub finalized_at: i64,

    #[max_len(200)]
    pub note: String,
    pub reference_amount: u64,
    pub proposed_donation: u64,
}

#[derive(Accounts)]
pub struct WithdrawBeforeComplete<'info> {
    #[account(mut)]
    pub withdrawer: Signer<'info>,

    #[account(
        mut,
        close = creator
    )]
    pub escrow: Account<'info, Escrow>,

    #[account(mut)]
    /// CHECK: creator receives escrow rent
    pub creator: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [
            b"vault",
            escrow.key().as_ref()
        ],
        bump
    )]
    /// CHECK: program-owned PDA vault for holding SOL
    pub vault: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct SuggestFinalization<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(mut)]
    pub escrow: Account<'info, Escrow>,
}

#[derive(Accounts)]
pub struct AcceptFinalization<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(mut)]
    pub escrow: Account<'info, Escrow>,

    #[account(mut)]
    /// CHECK:
    pub party_a: UncheckedAccount<'info>,

    #[account(mut)]
    /// CHECK:
    pub party_b: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [
            b"vault",
            escrow.key().as_ref()
        ],
        bump
    )]
    /// CHECK:
    pub vault: UncheckedAccount<'info>,
    
    #[account(
        mut,
        address = DONATION_RECIPIENT
    )]
    /// CHECK: hardcoded donation recipient
    pub donation_recipient: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct RejectFinalization<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(mut)]
    pub escrow: Account<'info, Escrow>,
}

#[derive(Accounts)]
pub struct CloseCompletedEscrow<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        close = creator
    )]
    pub escrow: Account<'info, Escrow>,

    #[account(
        mut,
        seeds = [
            b"vault",
            escrow.key().as_ref()
        ],
        bump
    )]
    /// CHECK: program-owned PDA vault for holding SOL
    pub vault: UncheckedAccount<'info>,
}

#[error_code]
pub enum EscrowError {
    #[msg("Invalid amount")]
    InvalidAmount,

    #[msg("Note is too long")]
    NoteTooLong,

    #[msg("Invalid escrow status")]
    InvalidStatus,

    #[msg("This wallet has already deposited")]
    AlreadyDeposited,

    #[msg("Deposit amount must match the required amount exactly")]
    InvalidDepositAmount,

    #[msg("Unauthorized wallet")]
    Unauthorized,

    #[msg("Invalid vault")]
    InvalidVault,

    #[msg("Creator must be either Party A or Party B")]
    CreatorMustBeParty,

    #[msg("Invalid party setup")]
    InvalidParty,

    #[msg("Nothing to withdraw")]
    NothingToWithdraw,

    #[msg("Invalid finalization amounts")]
    InvalidFinalization,

    #[msg("You cannot accept your own finalization")]
    CannotAcceptOwnFinalization,

    #[msg("You cannot reject your own finalization")]
    CannotRejectOwnFinalization,

    #[msg("Invalid donation")]
    InvalidDonation,

    #[msg("Invalid donation recipient")]
    InvalidDonationRecipient,
}