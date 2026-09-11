import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import {
    createFundedWallet,
    findEscrowPda,
    findVaultPda,
    getBalance,
} from "./escrow-test-helpers";

/*
 * E13 - Payout Redirection
 *
 * Purpose:
 * Verify that settlement payouts cannot be redirected
 * to attacker-controlled wallets.
 *
 * Scenario:
 * - Both parties fund the escrow.
 * - Party A proposes a valid finalization.
 * - Party B accepts, but supplies an attacker wallet
 *   instead of Party A's payout account.
 *
 * Expected:
 * - Transaction fails.
 * - Attacker receives no SOL.
 * - Escrow remains in FINALIZATION_SUGGESTED.
 * - Vault balance remains unchanged.
 */

describe("E13 - payout redirection", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.SolShopEscrow;

    it("blocks redirecting a party payout to an attacker", async () => {
        const partyA =
            await createFundedWallet(provider);

        const partyB =
            await createFundedWallet(provider);

        const attacker =
            await createFundedWallet(provider);

        const escrowId = new anchor.BN(1013);
        const oneSol =
            new anchor.BN(1_000_000_000);

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
                "E13 payout redirection"
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
                oneSol,
                oneSol,
                new anchor.BN(0),
                "equal split"
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

                    // Attacker tries to receive Party A's payout.
                    partyA: attacker.publicKey,
                    partyB: partyB.publicKey,
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

        expect(
            escrowData.finalizationProposer.toBase58()
        ).to.equal(partyA.publicKey.toBase58());

        console.log(
            "E13 PAYOUT REDIRECTION BLOCKED"
        );
    });
});
