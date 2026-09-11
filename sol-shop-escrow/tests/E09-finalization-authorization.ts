import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import {
    createFundedWallet,
    expectAnchorError,
    findEscrowPda,
    findVaultPda,
} from "./escrow-test-helpers";

/*
 * E09 - Finalization Authorization
 *
 * Purpose:
 * Verify that only Party A or Party B can participate
 * in finalization.
 *
 * Scenario:
 * - Both parties fully fund the escrow.
 * - An outsider tries to suggest a finalization.
 * - Party A creates a valid proposal.
 * - The outsider tries to reject it.
 *
 * Expected:
 * - Both outsider actions fail with Unauthorized.
 * - The valid proposal remains unchanged.
 */

describe("E09 - finalization authorization", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.SolShopEscrow;

    it("blocks outsiders from finalization actions", async () => {
        const partyA =
            await createFundedWallet(provider);

        const partyB =
            await createFundedWallet(provider);

        const outsider =
            await createFundedWallet(provider);

        const escrowId = new anchor.BN(1009);
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
                "E09 authorization"
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

        // Outsider cannot create a proposal.
        await expectAnchorError(
            () =>
                program.methods
                    .suggestFinalization(
                        oneSol,
                        oneSol,
                        new anchor.BN(0),
                        "outsider proposal"
                    )
                    .accounts({
                        signer: outsider.publicKey,
                        escrow,
                    })
                    .signers([outsider])
                    .rpc(),
            "Unauthorized"
        );

        let escrowData =
            await program.account.escrow.fetch(
                escrow
            );

        expect(escrowData.status).to.equal(1);

        // Party A creates a legitimate proposal.
        await program.methods
            .suggestFinalization(
                oneSol,
                oneSol,
                new anchor.BN(0),
                "valid proposal"
            )
            .accounts({
                signer: partyA.publicKey,
                escrow,
            })
            .signers([partyA])
            .rpc();

        escrowData =
            await program.account.escrow.fetch(
                escrow
            );

        expect(escrowData.status).to.equal(2);
        expect(
            escrowData.finalizationProposer.toBase58()
        ).to.equal(partyA.publicKey.toBase58());

        // Outsider cannot reject the proposal.
        await expectAnchorError(
            () =>
                program.methods
                    .rejectFinalization()
                    .accounts({
                        signer: outsider.publicKey,
                        escrow,
                    })
                    .signers([outsider])
                    .rpc(),
            "Unauthorized"
        );

        const escrowAfter =
            await program.account.escrow.fetch(
                escrow
            );

        expect(escrowAfter.status).to.equal(2);

        expect(
            escrowAfter.finalizationProposer.toBase58()
        ).to.equal(partyA.publicKey.toBase58());

        console.log(
            "E09 FINALIZATION AUTHORIZATION VERIFIED"
        );
    });
});
