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
 * E06 - No Withdrawal After Full Funding
 *
 * Purpose:
 * Verify that neither party can use withdraw_before_complete
 * after both required deposits are complete.
 *
 * Scenario:
 * - Party A deposits the required amount.
 * - Party B deposits the required amount.
 * - Escrow status becomes DEPOSITS_COMPLETE.
 * - Party A tries withdraw_before_complete.
 *
 * Expected:
 * - Withdrawal fails with InvalidStatus.
 * - Vault balance stays unchanged.
 * - Both recorded deposits stay unchanged.
 */

describe("E06 - no withdrawal after full funding", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.SolShopEscrow;

    it("blocks unilateral withdrawal after both parties deposit", async () => {
        const partyA =
            await createFundedWallet(provider);

        const partyB =
            await createFundedWallet(provider);

        const escrowId = new anchor.BN(1006);
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
                "E06 full funding"
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

        const escrowBefore =
            await program.account.escrow.fetch(
                escrow
            );

        expect(escrowBefore.status).to.equal(1);

        expect(
            escrowBefore.depositedA.toString()
        ).to.equal(oneSol.toString());

        expect(
            escrowBefore.depositedB.toString()
        ).to.equal(oneSol.toString());

        const vaultBefore =
            await getBalance(
                provider,
                vault
            );

        await expectAnchorError(
            () =>
                program.methods
                    .withdrawBeforeComplete()
                    .accounts({
                        withdrawer:
                            partyA.publicKey,
                        escrow,
                        creator:
                            partyA.publicKey,
                        vault,
                    })
                    .signers([partyA])
                    .rpc(),
            "InvalidStatus"
        );

        const escrowAfter =
            await program.account.escrow.fetch(
                escrow
            );

        const vaultAfter =
            await getBalance(
                provider,
                vault
            );

        expect(vaultAfter).to.equal(
            vaultBefore
        );

        expect(
            escrowAfter.depositedA.toString()
        ).to.equal(oneSol.toString());

        expect(
            escrowAfter.depositedB.toString()
        ).to.equal(oneSol.toString());

        expect(escrowAfter.status).to.equal(1);

        console.log(
            "E06 FULLY FUNDED WITHDRAWAL BLOCKED"
        );
    });
});
