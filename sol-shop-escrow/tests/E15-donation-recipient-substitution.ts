import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import {
    createFundedWallet,
    findEscrowPda,
    findVaultPda,
    getBalance,
} from "./escrow-test-helpers";

/*
 * E15 - Donation Recipient Substitution
 *
 * Purpose:
 * Verify that the donation payout cannot be redirected
 * to an attacker-controlled wallet.
 *
 * Scenario:
 * - Both parties fully fund the escrow.
 * - Party A proposes a settlement with a donation.
 * - Party B accepts but supplies an attacker wallet
 *   as donation_recipient.
 *
 * Expected:
 * - Transaction fails.
 * - Attacker receives no SOL.
 * - Vault balance stays unchanged.
 * - Escrow remains in FINALIZATION_SUGGESTED.
 */

describe("E15 - donation recipient substitution", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.SolShopEscrow;

    it("blocks replacing the fixed donation recipient", async () => {
        const partyA =
            await createFundedWallet(provider);

        const partyB =
            await createFundedWallet(provider);

        const attacker =
            await createFundedWallet(provider);

        const escrowId = new anchor.BN(1015);

        const oneSol =
            new anchor.BN(1_000_000_000);

        const donation =
            new anchor.BN(100_000_000);

        const payoutA =
            new anchor.BN(950_000_000);

        const payoutB =
            new anchor.BN(950_000_000);

        const [escrow] = findEscrowPda(
            partyA.publicKey,
            escrowId
        );

        const [vault] =
            findVaultPda(escrow);

        await program.methods
            .createEscrow(
                escrowId,
                0,
                partyA.publicKey,
                partyB.publicKey,
                oneSol,
                oneSol,
                oneSol,
                "E15 donation recipient"
            )
            .accounts({
                creator: partyA.publicKey,
                escrow,
                vault,
            })
            .signers([partyA])
            .rpc();

        await program.methods
            .deposit(oneSol)
            .accounts({
                depositor: partyA.publicKey,
                escrow,
                vault,
            })
            .signers([partyA])
            .rpc();

        await program.methods
            .deposit(oneSol)
            .accounts({
                depositor: partyB.publicKey,
                escrow,
                vault,
            })
            .signers([partyB])
            .rpc();

        await program.methods
            .suggestFinalization(
                payoutA,
                payoutB,
                donation,
                "donation test"
            )
            .accounts({
                signer: partyA.publicKey,
                escrow,
            })
            .signers([partyA])
            .rpc();

        const attackerBefore =
            await getBalance(
                provider,
                attacker.publicKey
            );

        const vaultBefore =
            await getBalance(
                provider,
                vault
            );

        let failed = false;

        try {
            await program.methods
                .acceptFinalization()
                .accounts({
                    signer: partyB.publicKey,
                    escrow,
                    vault,
                    partyA: partyA.publicKey,
                    partyB: partyB.publicKey,

                    // Attacker tries to replace the fixed
                    // donation recipient.
                    donationRecipient:
                        attacker.publicKey,
                })
                .signers([partyB])
                .rpc();
        } catch {
            failed = true;
        }

        expect(failed).to.equal(true);

        const attackerAfter =
            await getBalance(
                provider,
                attacker.publicKey
            );

        const vaultAfter =
            await getBalance(
                provider,
                vault
            );

        const escrowData =
            await program.account.escrow.fetch(
                escrow
            );

        expect(attackerAfter).to.equal(
            attackerBefore
        );

        expect(vaultAfter).to.equal(
            vaultBefore
        );

        expect(escrowData.status).to.equal(2);

        console.log(
            "E15 DONATION RECIPIENT SUBSTITUTION BLOCKED"
        );
    });
});
