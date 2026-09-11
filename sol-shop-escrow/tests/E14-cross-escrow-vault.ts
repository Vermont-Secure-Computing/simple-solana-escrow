import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import {
    createFundedWallet,
    findEscrowPda,
    findVaultPda,
    getBalance,
} from "./escrow-test-helpers";

/*
 * E14 - Cross-Escrow Vault Substitution
 *
 * Purpose:
 * Verify that one escrow cannot use another escrow's vault.
 *
 * Scenario:
 * - Create and fully fund Escrow A.
 * - Create Escrow B with its own vault.
 * - Party A proposes finalization for Escrow A.
 * - Party B tries to accept using Escrow B's vault.
 *
 * Expected:
 * - Transaction fails.
 * - Neither vault balance changes.
 * - Escrow A remains in FINALIZATION_SUGGESTED.
 */

describe("E14 - cross-escrow vault", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.SolShopEscrow;

    it("blocks using another escrow's vault", async () => {
        const partyA =
            await createFundedWallet(provider);

        const partyB =
            await createFundedWallet(provider);

        const escrowIdA = new anchor.BN(1014);
        const escrowIdB = new anchor.BN(2014);

        const oneSol =
            new anchor.BN(1_000_000_000);

        const [escrowA] = findEscrowPda(
            partyA.publicKey,
            escrowIdA
        );

        const [vaultA] =
            findVaultPda(escrowA);

        const [escrowB] = findEscrowPda(
            partyA.publicKey,
            escrowIdB
        );

        const [vaultB] =
            findVaultPda(escrowB);

        // Create Escrow A.
        await program.methods
            .createEscrow(
                escrowIdA,
                0,
                partyA.publicKey,
                partyB.publicKey,
                oneSol,
                oneSol,
                oneSol,
                "E14 escrow A"
            )
            .accounts({
                creator: partyA.publicKey,
                escrow: escrowA,
                vault: vaultA,
            })
            .signers([partyA])
            .rpc();

        // Fully fund Escrow A.
        await program.methods
            .deposit(oneSol)
            .accounts({
                depositor: partyA.publicKey,
                escrow: escrowA,
                vault: vaultA,
            })
            .signers([partyA])
            .rpc();

        await program.methods
            .deposit(oneSol)
            .accounts({
                depositor: partyB.publicKey,
                escrow: escrowA,
                vault: vaultA,
            })
            .signers([partyB])
            .rpc();

        // Create Escrow B.
        await program.methods
            .createEscrow(
                escrowIdB,
                0,
                partyA.publicKey,
                partyB.publicKey,
                oneSol,
                oneSol,
                oneSol,
                "E14 escrow B"
            )
            .accounts({
                creator: partyA.publicKey,
                escrow: escrowB,
                vault: vaultB,
            })
            .signers([partyA])
            .rpc();

        // Valid proposal for Escrow A.
        await program.methods
            .suggestFinalization(
                oneSol,
                oneSol,
                new anchor.BN(0),
                "E14 settlement"
            )
            .accounts({
                signer: partyA.publicKey,
                escrow: escrowA,
            })
            .signers([partyA])
            .rpc();

        const vaultABefore =
            await getBalance(provider, vaultA);

        const vaultBBefore =
            await getBalance(provider, vaultB);

        let failed = false;

        try {
            await program.methods
                .acceptFinalization()
                .accounts({
                    signer: partyB.publicKey,
                    escrow: escrowA,

                    // Wrong vault: belongs to Escrow B.
                    vault: vaultB,

                    partyA: partyA.publicKey,
                    partyB: partyB.publicKey,
                })
                .signers([partyB])
                .rpc();
        } catch {
            failed = true;
        }

        expect(failed).to.equal(true);

        const vaultAAfter =
            await getBalance(provider, vaultA);

        const vaultBAfter =
            await getBalance(provider, vaultB);

        const escrowAData =
            await program.account.escrow.fetch(
                escrowA
            );

        expect(vaultAAfter).to.equal(
            vaultABefore
        );

        expect(vaultBAfter).to.equal(
            vaultBBefore
        );

        expect(escrowAData.status).to.equal(2);

        console.log(
            "E14 CROSS-ESCROW VAULT SUBSTITUTION BLOCKED"
        );
    });
});
