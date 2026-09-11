import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import {
    createFundedWallet,
    findEscrowPda,
    findVaultPda,
} from "./escrow-test-helpers";

/*
 * E11 - Reject and Re-propose
 *
 * Purpose:
 * Verify that a rejected finalization returns the escrow
 * to the fully funded state and allows a new proposal.
 *
 * Scenario:
 * - Both parties fully fund the escrow.
 * - Party A proposes a settlement.
 * - Party B rejects it.
 * - Party B creates a new settlement proposal.
 *
 * Expected:
 * - Rejection returns status to DEPOSITS_COMPLETE.
 * - Previous proposal is no longer active.
 * - A new proposal can be created.
 */

describe("E11 - reject and repropose", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.SolShopEscrow;

    it("allows a new proposal after rejection", async () => {
        const partyA =
            await createFundedWallet(provider);

        const partyB =
            await createFundedWallet(provider);

        const escrowId = new anchor.BN(1011);
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
                "E11 reject and repropose"
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
                "first proposal"
            )
            .accounts({
                signer: partyA.publicKey,
                escrow,
            })
            .signers([partyA])
            .rpc();

        let escrowData =
            await program.account.escrow.fetch(
                escrow
            );

        expect(escrowData.status).to.equal(2);

        expect(
            escrowData.finalizationProposer.toBase58()
        ).to.equal(partyA.publicKey.toBase58());

        await program.methods
            .rejectFinalization()
            .accounts({
                signer: partyB.publicKey,
                escrow,
            })
            .signers([partyB])
            .rpc();

        escrowData =
            await program.account.escrow.fetch(
                escrow
            );

        expect(escrowData.status).to.equal(1);

        await program.methods
            .suggestFinalization(
                new anchor.BN(1_500_000_000),
                new anchor.BN(500_000_000),
                new anchor.BN(0),
                "second proposal"
            )
            .accounts({
                signer: partyB.publicKey,
                escrow,
            })
            .signers([partyB])
            .rpc();

        escrowData =
            await program.account.escrow.fetch(
                escrow
            );

        expect(escrowData.status).to.equal(2);

        expect(
            escrowData.finalizationProposer.toBase58()
        ).to.equal(partyB.publicKey.toBase58());

        expect(
            escrowData.proposedPayoutA.toString()
        ).to.equal("1500000000");

        expect(
            escrowData.proposedPayoutB.toString()
        ).to.equal("500000000");

        console.log(
            "E11 REJECT AND REPROPOSE VERIFIED"
        );
    });
});
