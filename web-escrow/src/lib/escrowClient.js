import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import BN from "bn.js";
import idl from "../idl/sol_shop_escrow.json";

export const PROGRAM_ID = new PublicKey(
  "E13gKpCo3pmg1QizBgEt2kxkVuTXAN6mrQQaS4aAt9LZ"
);

export const ESCROW_TYPE_PAYMENT = 0;
export const ESCROW_TYPE_BET = 1;
export const ESCROW_TYPE_MUTUAL_BOND = 2;
export const ESCROW_TYPE_CUSTOM = 3;

export function getProgram(wallet, connection) {
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  return new anchor.Program(idl, provider);
}

export function deriveEscrowPda({ creatorPubkey, escrowId }) {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("escrow"),
      creatorPubkey.toBuffer(),
      new BN(escrowId).toArrayLike(Buffer, "le", 8),
    ],
    PROGRAM_ID
  );
}

export function deriveVaultPda({ escrowPda }) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), escrowPda.toBuffer()],
    PROGRAM_ID
  );
}

export async function createEscrow({
  wallet,
  connection,
  escrowType,
  partyA,
  partyB,
  escrowId,
  requiredDepositA,
  requiredDepositB,
  note,
}) {
  const program = getProgram(wallet, connection);

  const [escrowPda] = deriveEscrowPda({
    creatorPubkey: wallet.publicKey,
    escrowId,
  });

  const [vaultPda] = deriveVaultPda({ escrowPda });

  const sig = await program.methods
    .createEscrow(
      new BN(escrowId),
      escrowType,
      new PublicKey(partyA),
      new PublicKey(partyB),
      new BN(requiredDepositA),
      new BN(requiredDepositB),
      note
    )
    .accounts({
      creator: wallet.publicKey,
      escrow: escrowPda,
      vault: vaultPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return {
    signature: sig,
    escrowPda: escrowPda.toBase58(),
    vaultPda: vaultPda.toBase58(),
  };
}

export async function fetchEscrowsForWallet({ wallet, connection }) {
  const program = getProgram(wallet, connection);
  const walletPubkey = wallet.publicKey.toBase58();

  // Anchor discriminator = 8 bytes
  // creator = offset 8
  // party_a = offset 8 + 32 = 40
  // party_b = offset 8 + 32 + 32 = 72
  const creatorOffset = 8;
  const partyAOffset = 40;
  const partyBOffset = 72;

  const creatorEscrows = await program.account.escrow.all([
    {
      memcmp: {
        offset: creatorOffset,
        bytes: walletPubkey,
      },
    },
  ]);

  const partyAEscrows = await program.account.escrow.all([
    {
      memcmp: {
        offset: partyAOffset,
        bytes: walletPubkey,
      },
    },
  ]);

  const partyBEscrows = await program.account.escrow.all([
    {
      memcmp: {
        offset: partyBOffset,
        bytes: walletPubkey,
      },
    },
  ]);

  const unique = new Map();

  [...creatorEscrows, ...partyAEscrows, ...partyBEscrows].forEach((item) => {
    unique.set(item.publicKey.toBase58(), item);
  });

  return Array.from(unique.values()).map((item) => {
    const escrow = item.account;

    return {
      pda: item.publicKey.toBase58(),

      creator: escrow.creator.toBase58(),
      partyA: escrow.partyA.toBase58(),
      partyB: escrow.partyB.toBase58(),

      escrowType: escrow.escrowType,

      requiredDepositA: escrow.requiredDepositA.toString(),
      requiredDepositB: escrow.requiredDepositB.toString(),

      depositedA: escrow.depositedA.toString(),
      depositedB: escrow.depositedB.toString(),

      proposedPayoutA: escrow.proposedPayoutA.toString(),
      proposedPayoutB: escrow.proposedPayoutB.toString(),
      finalizationProposer: escrow.finalizationProposer.toBase58(),
      finalizationNote: escrow.finalizationNote,

      vault: escrow.vault.toBase58(),
      status: escrow.status,

      createdAt: escrow.createdAt.toString(),
      depositAt: escrow.depositAt.toString(),
      finalizedAt: escrow.finalizedAt.toString(),

      note: escrow.note,
    };
  });
}

export async function fetchEscrowByPda({ wallet, connection, escrowPda }) {
  const program = getProgram(wallet, connection);
  const pubkey = new PublicKey(escrowPda);

  const escrow = await program.account.escrow.fetch(pubkey);

  return {
      pda: item.publicKey.toBase58(),

      creator: escrow.creator.toBase58(),
      partyA: escrow.partyA.toBase58(),
      partyB: escrow.partyB.toBase58(),

      escrowType: escrow.escrowType,

      requiredDepositA: escrow.requiredDepositA.toString(),
      requiredDepositB: escrow.requiredDepositB.toString(),

      depositedA: escrow.depositedA.toString(),
      depositedB: escrow.depositedB.toString(),

      proposedPayoutA: escrow.proposedPayoutA.toString(),
      proposedPayoutB: escrow.proposedPayoutB.toString(),
      finalizationProposer: escrow.finalizationProposer.toBase58(),
      finalizationNote: escrow.finalizationNote,

      vault: escrow.vault.toBase58(),
      status: escrow.status,

      createdAt: escrow.createdAt.toString(),
      depositAt: escrow.depositAt.toString(),
      finalizedAt: escrow.finalizedAt.toString(),

      note: escrow.note,
    };
}

export async function fundEscrow({
  wallet,
  connection,
  escrowPda,
  vaultPda,
  amountLamports,
}) {
  const program = getProgram(wallet, connection);

  const sig = await program.methods
    .deposit(new BN(amountLamports))
    .accounts({
      depositor: wallet.publicKey,
      escrow: new PublicKey(escrowPda),
      vault: new PublicKey(vaultPda),
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return sig;
}

export async function withdrawBeforeComplete({
  wallet,
  connection,
  escrowPda,
  vaultPda,
  creator,
}) {
  const program = getProgram(wallet, connection);

  const sig = await program.methods
    .withdrawBeforeComplete()
    .accounts({
      withdrawer: wallet.publicKey,
      escrow: new PublicKey(escrowPda),
      vault: new PublicKey(vaultPda),
      creator: new PublicKey(creator),
    })
    .rpc();

  return sig;
}

export async function suggestFinalization({
  wallet,
  connection,
  escrowPda,
  payoutA,
  payoutB,
  finalizationNote,
}) {
  const program = getProgram(wallet, connection);

  const sig = await program.methods
    .suggestFinalization(new BN(payoutA), new BN(payoutB), finalizationNote)
    .accounts({
      signer: wallet.publicKey,
      escrow: new PublicKey(escrowPda),
    })
    .rpc();

  return sig;
}

export async function acceptFinalization({
  wallet,
  connection,
  escrowPda,
  vaultPda,
  partyA,
  partyB,
}) {
  const program = getProgram(wallet, connection);

  const sig = await program.methods
    .acceptFinalization()
    .accounts({
      signer: wallet.publicKey,
      escrow: new PublicKey(escrowPda),
      vault: new PublicKey(vaultPda),
      partyA: new PublicKey(partyA),
      partyB: new PublicKey(partyB),
    })
    .rpc();

  return sig;
}

export async function rejectFinalization({
  wallet,
  connection,
  escrowPda,
}) {
  const program = getProgram(wallet, connection);

  const sig = await program.methods
    .rejectFinalization()
    .accounts({
      signer: wallet.publicKey,
      escrow: new PublicKey(escrowPda),
    })
    .rpc();

  return sig;
}