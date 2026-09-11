import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import {
    createFundedWallet,
    findEscrowPda,
    findVaultPda,
} from "./escrow-test-helpers";

/*
 * E21 - Deposit Overflow
 *
 * Purpose:
 * Check whether extreme required deposit values can cause
 * arithmetic overflow or invalid escrow state.
 *
 * Scenario:
 * - Create an escrow with near-u64-max required deposits.
 * - Attempt deposits that cannot realistically be funded.
 *
 * Expected:
 * - Deposit attempt fails safely.
 * - Escrow state remains unchanged.
 */

describe("E21 - deposit overflow", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.SolShopEscrow;

    it("fails safely with extreme deposit amounts", async () => {
        const partyA =
            await createFundedWallet(provider);

        const partyB =
            await createFundedWallet(provider);

        const escrowId =
            new anchor.BN(1021);

        const hugeAmount =
            new anchor.BN(
                "18446744073709551615"
            );

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
                hugeAmount,
                hugeAmount,
                new anchor.BN(1),
                "E21 extreme deposit"
            )
            .accounts({
                creator: partyA.publicKey,
                escrow,
                vault,
            })
            .signers([partyA])
            .rpc();

        let failed = false;

        try {
            await program.methods
                .deposit(hugeAmount)
                .accounts({
                    depositor: partyA.publicKey,
                    escrow,
                    vault,
                })
                .signers([partyA])
                .rpc();
        } catch {
            failed = true;
        }

        expect(failed).to.equal(true);

        const escrowData =
            await program.account.escrow.fetch(
                escrow
            );

        expect(
            escrowData.depositedA.toString()
        ).to.equal("0");

        expect(
            escrowData.depositedB.toString()
        ).to.equal("0");

        expect(
            escrowData.status
        ).to.equal(0);

        console.log(
            "E21 EXTREME DEPOSIT FAILS SAFELY"
        );
    });
});
