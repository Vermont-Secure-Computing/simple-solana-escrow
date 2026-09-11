import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import { Keypair, PublicKey } from "@solana/web3.js";
import {
    createFundedWallet,
    findEscrowPda,
    findVaultPda,
    accountExists,
} from "./escrow-test-helpers";

/*
 * E23 - Creation Parameter Validation
 *
 * Purpose:
 * Verify invalid escrow creation parameters are rejected and
 * document the current escrow_type behavior.
 *
 * Scenario:
 * - Try zero deposit amounts.
 * - Try zero reference amount.
 * - Try both parties unset.
 * - Try using the same wallet for both parties.
 * - Try an arbitrary escrow_type.
 *
 * Expected:
 * - Invalid financial/party configurations are rejected.
 * - Failed creations leave no escrow account.
 * - Current arbitrary escrow_type behavior is documented.
 */

describe("E23 - creation parameters", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.SolShopEscrow;

    const oneSol = new anchor.BN(1_000_000_000);

    async function tryCreate(
        id: number,
        creator: Keypair,
        partyA: PublicKey,
        partyB: PublicKey,
        depositA: anchor.BN,
        depositB: anchor.BN,
        referenceAmount: anchor.BN,
        escrowType = 0
    ) {
        const escrowId = new anchor.BN(id);

        const [escrow] = findEscrowPda(
            creator.publicKey,
            escrowId
        );

        const [vault] = findVaultPda(escrow);

        let errorCode: string | undefined;

        try {
            await program.methods
                .createEscrow(
                    escrowId,
                    escrowType,
                    partyA,
                    partyB,
                    depositA,
                    depositB,
                    referenceAmount,
                    "E23 validation"
                )
                .accounts({
                    creator: creator.publicKey,
                    escrow,
                    vault,
                })
                .signers([creator])
                .rpc();
        } catch (err: any) {
            errorCode =
                err?.error?.errorCode?.code ??
                "TRANSACTION_FAILED";
        }

        return {
            escrow,
            errorCode,
            exists: await accountExists(
                provider,
                escrow
            ),
        };
    }

    it("validates escrow creation parameters", async () => {
        const creator =
            await createFundedWallet(provider);

        const partyB =
            await createFundedWallet(provider);

        const zero = new anchor.BN(0);
        const unset = PublicKey.default;

        const zeroA = await tryCreate(
            2301,
            creator,
            creator.publicKey,
            partyB.publicKey,
            zero,
            oneSol,
            oneSol
        );

        expect(zeroA.errorCode).to.not.equal(
            undefined
        );
        expect(zeroA.exists).to.equal(false);

        const zeroB = await tryCreate(
            2302,
            creator,
            creator.publicKey,
            partyB.publicKey,
            oneSol,
            zero,
            oneSol
        );

        expect(zeroB.errorCode).to.not.equal(
            undefined
        );
        expect(zeroB.exists).to.equal(false);

        const zeroReference = await tryCreate(
            2303,
            creator,
            creator.publicKey,
            partyB.publicKey,
            oneSol,
            oneSol,
            zero
        );

        expect(
            zeroReference.errorCode
        ).to.not.equal(undefined);

        expect(
            zeroReference.exists
        ).to.equal(false);

        const bothUnset = await tryCreate(
            2304,
            creator,
            unset,
            unset,
            oneSol,
            oneSol,
            oneSol
        );

        expect(
            bothUnset.errorCode
        ).to.not.equal(undefined);

        expect(
            bothUnset.exists
        ).to.equal(false);

        const sameParty = await tryCreate(
            2305,
            creator,
            creator.publicKey,
            creator.publicKey,
            oneSol,
            oneSol,
            oneSol
        );

        expect(
            sameParty.errorCode
        ).to.not.equal(undefined);

        expect(
            sameParty.exists
        ).to.equal(false);

        /*
         * Current source does not restrict escrow_type.
         * We document that behavior rather than calling
         * it an exploit.
         */
        const arbitraryType = await tryCreate(
            2306,
            creator,
            creator.publicKey,
            partyB.publicKey,
            oneSol,
            oneSol,
            oneSol,
            255
        );

        console.log(
            `Arbitrary escrow_type accepted: ${
                arbitraryType.errorCode === undefined
            }`
        );

        if (arbitraryType.errorCode === undefined) {
            expect(
                arbitraryType.exists
            ).to.equal(true);

            const data =
                await program.account.escrow.fetch(
                    arbitraryType.escrow
                );

            expect(data.escrowType).to.equal(255);
        }

        console.log(
            "E23 CREATION PARAMETER VALIDATION VERIFIED"
        );
    });
});
