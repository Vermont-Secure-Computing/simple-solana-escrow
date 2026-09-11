import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import {
    Keypair,
    SystemProgram,
    Transaction,
} from "@solana/web3.js";
import {
    createFundedWallet,
    findEscrowPda,
    findVaultPda,
    getBalance,
} from "./escrow-test-helpers";

/*
 * E17 - Extra SOL in Vault
 *
 * Purpose:
 * Verify what happens when SOL is sent directly to the vault
 * outside the normal deposit flow.
 *
 * Scenario:
 * - Both parties deposit 1 SOL each.
 * - An outsider sends 0.25 SOL directly to the vault.
 * - The escrow is finalized for the recorded 2 SOL only.
 * - The completed escrow is then closed.
 *
 * Expected current behavior:
 * - Finalization distributes only the recorded 2 SOL.
 * - The extra 0.25 SOL remains in the vault.
 * - close_completed_escrow sends the remaining vault balance
 *   to the escrow creator.
 */

describe("E17 - extra SOL in vault", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.SolShopEscrow;

    it("checks who receives unsolicited SOL left in the vault", async () => {
        const partyA =
            await createFundedWallet(provider);

        const partyB =
            await createFundedWallet(provider);

        const outsider =
            await createFundedWallet(provider);

        const escrowId = new anchor.BN(1017);

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
                "E17 extra SOL"
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

        const tx = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: outsider.publicKey,
                toPubkey: vault,
                lamports: extraLamports,
            })
        );

        await provider.sendAndConfirm(
            tx,
            [outsider]
        );

        const vaultAfterExtra =
            await getBalance(
                provider,
                vault
            );

        await program.methods
            .suggestFinalization(
                oneSol,
                oneSol,
                new anchor.BN(0),
                "normal settlement"
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

        const vaultAfterFinalization =
            await getBalance(
                provider,
                vault
            );

        expect(
            vaultAfterExtra - vaultAfterFinalization
        ).to.equal(2_000_000_000);

        expect(
            vaultAfterFinalization
        ).to.be.greaterThanOrEqual(
            extraLamports
        );

        const creatorBeforeClose =
            await getBalance(
                provider,
                partyA.publicKey
            );

        const vaultBeforeClose =
            await getBalance(
                provider,
                vault
            );

        await program.methods
            .closeCompletedEscrow()
            .accounts({
                creator: partyA.publicKey,
                escrow,
                vault,
            })
            .signers([partyA])
            .rpc();

        const creatorAfterClose =
            await getBalance(
                provider,
                partyA.publicKey
            );

        /*
         * Creator pays the close transaction fee, so the
         * received amount will be vault balance minus tx fee.
         */
        expect(
            creatorAfterClose
        ).to.be.greaterThan(
            creatorBeforeClose +
            vaultBeforeClose -
            20_000_000
        );

        console.log(
            "E17 EXTRA VAULT SOL GOES TO CREATOR ON CLOSE"
        );
        console.log(
            `Vault before close: ${vaultBeforeClose}`
        );
    });
});
