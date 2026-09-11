import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import {
    accountExists,
    createFundedWallet,
    expectAnchorError,
    findEscrowPda,
    findVaultPda,
} from "./escrow-test-helpers";

/*
 * E10 - Finalization Agreement
 *
 * Purpose:
 * Verify that a finalization proposal requires approval
 * from the other party.
 *
 * Scenario:
 * - Both parties fully fund the escrow.
 * - Party A proposes a valid finalization.
 * - Party A tries to accept its own proposal.
 * - Party B accepts the proposal.
 *
 * Expected:
 * - Party A's self-accept attempt fails.
 * - Party B can accept the proposal.
 * - Escrow becomes COMPLETED.
 */

describe("E10 - finalization agreement", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.SolShopEscrow;

    it("requires the other party to accept finalization", async () => {
        const partyA =
            await createFundedWallet(provider);

        const partyB =
            await createFundedWallet(provider);

        const escrowId = new anchor.BN(1010);
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
                "E10 finalization agreement"
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
                "split equally"
            )
            .accounts({
                signer: partyA.publicKey,
                escrow,
            })
            .signers([partyA])
            .rpc();

        // Proposer cannot accept its own proposal.
        await expectAnchorError(
            () =>
                program.methods
                    .acceptFinalization()
                    .accounts({
                        signer: partyA.publicKey,
                        escrow,
                        vault,
                        partyA: partyA.publicKey,
                        partyB: partyB.publicKey,
                    })
                    .signers([partyA])
                    .rpc(),
            "CannotAcceptOwnFinalization"
        );

        let escrowData =
            await program.account.escrow.fetch(
                escrow
            );

        expect(escrowData.status).to.equal(2);

        // Other party accepts.
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

        escrowData =
            await program.account.escrow.fetch(
                escrow
            );

        expect(escrowData.status).to.equal(3);

        expect(
            await accountExists(provider, escrow)
        ).to.equal(true);

        console.log(
            "E10 FINALIZATION AGREEMENT VERIFIED"
        );
    });
});
