import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import {
    SystemProgram,
    Transaction,
} from "@solana/web3.js";
import {
    accountExists,
    createFundedWallet,
    findEscrowPda,
    findVaultPda,
    getBalance,
} from "./escrow-test-helpers";

/*
 * E20 - Unauthorized Completed Close
 *
 * Purpose:
 * Verify that an attacker cannot close a completed escrow
 * and redirect its remaining vault balance or rent.
 *
 * Scenario:
 * - Both parties fully fund and complete an escrow.
 * - Extra SOL is sent directly to the vault.
 * - An attacker tries to call close_completed_escrow
 *   while supplying their own wallet as creator.
 *
 * Expected:
 * - Attack fails.
 * - Attacker balance does not increase.
 * - Escrow remains open.
 * - Vault balance remains unchanged.
 */

describe("E20 - unauthorized completed close", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.SolShopEscrow;

    it("blocks an attacker from closing another creator's escrow", async () => {
        const partyA =
            await createFundedWallet(provider);

        const partyB =
            await createFundedWallet(provider);

        const attacker =
            await createFundedWallet(provider);

        const outsider =
            await createFundedWallet(provider);

        const escrowId =
            new anchor.BN(1020);

        const oneSol =
            new anchor.BN(1_000_000_000);

        const extraLamports =
            250_000_000;

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
                "E20 unauthorized close"
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

        /*
         * Leave something valuable in the vault after
         * normal settlement.
         */
        const extraTx = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: outsider.publicKey,
                toPubkey: vault,
                lamports: extraLamports,
            })
        );

        await provider.sendAndConfirm(
            extraTx,
            [outsider]
        );

        await program.methods
            .suggestFinalization(
                oneSol,
                oneSol,
                new anchor.BN(0),
                "E20 settlement"
            )
            .accounts({
                signer: partyA.publicKey,
                escrow,
            })
            .signers([partyA])
            .rpc();

        await program.methods
            .acceptFinalization()
            .accounts({
                signer: partyB.publicKey,
                escrow,
                vault,
                partyA: partyA.publicKey,
                partyB: partyB.publicKey,
            })
            .signers([partyB])
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
                .closeCompletedEscrow()
                .accounts({
                    creator: attacker.publicKey,
                    escrow,
                    vault,
                })
                .signers([attacker])
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

        expect(attackerAfter).to.equal(
            attackerBefore
        );

        expect(vaultAfter).to.equal(
            vaultBefore
        );

        expect(
            await accountExists(
                provider,
                escrow
            )
        ).to.equal(true);

        const escrowData =
            await program.account.escrow.fetch(
                escrow
            );

        expect(
            escrowData.status
        ).to.equal(3);

        console.log(
            "E20 UNAUTHORIZED COMPLETED CLOSE BLOCKED"
        );
    });
});
