import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import {
    createFundedWallet,
    expectAnchorError,
    findEscrowPda,
    findVaultPda,
    getBalance,
} from "./escrow-test-helpers";

/*
 * E08 - Deposit Invariants
 *
 * Purpose:
 * Verify that deposit() only accepts the correct party,
 * correct amount, and one deposit per party.
 *
 * Tests:
 * - Wrong deposit amount is rejected.
 * - The same party cannot deposit twice.
 * - An outsider cannot deposit into a fixed-party escrow.
 *
 * Expected:
 * - Invalid deposits fail.
 * - Valid deposited funds remain unchanged.
 */

describe("E08 - deposit invariants", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.SolShopEscrow;

    it("rejects wrong amount, duplicate deposit, and outsider deposit", async () => {
        const partyA =
            await createFundedWallet(provider);

        const partyB =
            await createFundedWallet(provider);

        const outsider =
            await createFundedWallet(provider);

        const escrowId = new anchor.BN(1008);
        const oneSol =
            new anchor.BN(1_000_000_000);

        const wrongAmount =
            new anchor.BN(500_000_000);

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
                "E08 deposit invariants"
            )
            .accounts({
                creator: partyA.publicKey,
                escrow,
                vault,
            })
            .signers([partyA])
            .rpc();

        // Wrong amount
        await expectAnchorError(
            () =>
                program.methods
                    .deposit(wrongAmount)
                    .accounts({
                        depositor:
                            partyA.publicKey,
                        escrow,
                        vault,
                    })
                    .signers([partyA])
                    .rpc(),
            "InvalidDepositAmount"
        );

        let escrowData =
            await program.account.escrow.fetch(
                escrow
            );

        expect(
            escrowData.depositedA.toString()
        ).to.equal("0");

        // Valid Party A deposit
        await program.methods
            .deposit(oneSol)
            .accounts({
                depositor: partyA.publicKey,
                escrow,
                vault,
            })
            .signers([partyA])
            .rpc();

        const vaultAfterValidDeposit =
            await getBalance(
                provider,
                vault
            );

        // Duplicate Party A deposit
        await expectAnchorError(
            () =>
                program.methods
                    .deposit(oneSol)
                    .accounts({
                        depositor:
                            partyA.publicKey,
                        escrow,
                        vault,
                    })
                    .signers([partyA])
                    .rpc(),
            "AlreadyDeposited"
        );

        // Outsider deposit
        await expectAnchorError(
            () =>
                program.methods
                    .deposit(oneSol)
                    .accounts({
                        depositor:
                            outsider.publicKey,
                        escrow,
                        vault,
                    })
                    .signers([outsider])
                    .rpc(),
            "Unauthorized"
        );

        escrowData =
            await program.account.escrow.fetch(
                escrow
            );

        const vaultAfterInvalidAttempts =
            await getBalance(
                provider,
                vault
            );

        expect(
            escrowData.depositedA.toString()
        ).to.equal(oneSol.toString());

        expect(
            escrowData.depositedB.toString()
        ).to.equal("0");

        expect(
            escrowData.status
        ).to.equal(0);

        expect(
            vaultAfterInvalidAttempts
        ).to.equal(vaultAfterValidDeposit);

        console.log(
            "E08 DEPOSIT INVARIANTS VERIFIED"
        );
    });
});

