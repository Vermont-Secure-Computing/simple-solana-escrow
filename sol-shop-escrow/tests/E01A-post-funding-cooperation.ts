import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import { PublicKey } from "@solana/web3.js";
import {
    createFundedWallet,
    expectAnchorError,
    findEscrowPda,
    findVaultPda,
    getBalance,
} from "./escrow-test-helpers";

/*
 * E01-A - Post-Funding Cooperation
 *
 * Purpose:
 * Verify the low-level escrow behavior after both parties have funded.
 *
 * Scenario:
 * - Party A deposits.
 * - An open Party B slot is claimed and funded.
 * - Both deposits are complete.
 * - Party A proposes a valid finalization.
 * - Party A cannot accept its own proposal.
 * - Party B takes no action.
 *
 * Expected:
 * - Party A cannot use withdraw_before_complete after both deposits.
 * - Party A cannot accept its own finalization.
 * - Funds remain in the vault until another valid escrow action occurs.
 *
 * This test documents the generic escrow's cooperation requirement.
 * Whether a higher-level timeout/cancellation path is required depends
 * on the application using the escrow.
 */

describe("E01-A - settlement hostage", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.SolShopEscrow;

    it("malicious open-party claimant can currently block settlement", async () => {
        const creator =
            await createFundedWallet(provider);

        const attacker =
            await createFundedWallet(provider);

        const escrowId = new anchor.BN(1002);

        const [escrow] = findEscrowPda(
            creator.publicKey,
            escrowId
        );

        const [vault] =
            findVaultPda(escrow);

        const oneSol =
            new anchor.BN(1_000_000_000);

        await program.methods
            .createEscrow(
                escrowId,
                0,
                creator.publicKey,
                PublicKey.default,
                oneSol,
                oneSol,
                oneSol,
                "E01-A hostage test"
            )
            .accounts({
                creator: creator.publicKey,
                escrow,
                vault,
            })
            .signers([creator])
            .rpc();

        // Party A funds first.
        await program.methods
            .deposit(oneSol)
            .accounts({
                depositor: creator.publicKey,
                escrow,
                vault,
            })
            .signers([creator])
            .rpc();

        // Attacker claims the open Party B slot.
        await program.methods
            .deposit(oneSol)
            .accounts({
                depositor: attacker.publicKey,
                escrow,
                vault,
            })
            .signers([attacker])
            .rpc();

        let data =
            await program.account.escrow.fetch(
                escrow
            );

        expect(
            data.partyB.toBase58()
        ).to.equal(
            attacker.publicKey.toBase58()
        );

        expect(data.status).to.equal(1);
        expect(
            data.depositedA.toString()
        ).to.equal(oneSol.toString());
        expect(
            data.depositedB.toString()
        ).to.equal(oneSol.toString());

        const vaultBalanceBefore =
            await getBalance(provider, vault);

        /*
         * Once both deposits are complete, Party A can no longer
         * use withdraw_before_complete to recover its own deposit.
         */
        await expectAnchorError(
            () =>
                program.methods
                    .withdrawBeforeComplete()
                    .accounts({
                        withdrawer:
                            creator.publicKey,
                        escrow,
                        creator:
                            creator.publicKey,
                        vault,
                    })
                    .signers([creator])
                    .rpc(),
            "InvalidStatus"
        );

        // Creator proposes returning 1 SOL to each party.
        await program.methods
            .suggestFinalization(
                oneSol,
                oneSol,
                new anchor.BN(0),
                "Return both deposits"
            )
            .accounts({
                signer: creator.publicKey,
                escrow,
            })
            .signers([creator])
            .rpc();

        data =
            await program.account.escrow.fetch(
                escrow
            );

        expect(data.status).to.equal(2);
        expect(
            data.finalizationProposer.toBase58()
        ).to.equal(
            creator.publicKey.toBase58()
        );

        /*
         * Creator cannot complete its own proposal.
         * The attacker would need to accept it.
         */
        await expectAnchorError(
            () =>
                program.methods
                    .acceptFinalization()
                    .accounts({
                        signer:
                            creator.publicKey,
                        escrow,
                        partyA:
                            creator.publicKey,
                        partyB:
                            attacker.publicKey,
                        vault,
                        donationRecipient:
                            new PublicKey(
                                "61Gt8siRo84pmGziia5dHuJMkx9ne1d4Cb5aHsyQGP85"
                            ),
                    })
                    .signers([creator])
                    .rpc(),
            "CannotAcceptOwnFinalization"
        );

        const vaultBalanceAfter =
            await getBalance(provider, vault);

        data =
            await program.account.escrow.fetch(
                escrow
            );

        expect(data.status).to.equal(2);

        // Failed escape attempts must not release escrowed SOL.
        expect(vaultBalanceAfter).to.equal(
            vaultBalanceBefore
        );

        console.log(
            "E01-A POST-FUNDING COOPERATION VERIFIED"
        );
    });
});