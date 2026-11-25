"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount, usePublicClient, useSignMessage, useWriteContract } from "wagmi";
import { celo } from "wagmi/chains";
import { friendlyError } from "@/lib/txErrors";
import { ApiError, useApi } from "@/lib/useApi";
import { ADDR, identityAbi } from "@learnit/backend/chain";
import { flowClaimMessage } from "@learnit/backend/flowClaim";
import { Award, Trophy } from "@/components/icons";
import { Button, Card, Notice } from "./ui";

// GoodDollar's "GoodBuilders" Flow Council: Celo wallets with voting power there choose how a funding
// pool gets split among projects. One tap puts 10 votes behind LearnIt. A wallet may only do this once;
// the button disables itself afterward, checked against the chain so it stays disabled across reloads too.
const COUNCIL = "0x889e0aADaA3F8B28A794ef70dA147827C620a590";
const LEARNIT = "0x6dd5bf59F6bc4b2776c6891bF5C54198BFFA14C3";
const POPUP_VOTES = 10n;

const abi = [
  { type: "function", name: "vote", stateMutability: "nonpayable", outputs: [],
    inputs: [{ name: "_votes", type: "tuple[]", components: [
      { name: "recipient", type: "address" }, { name: "amount", type: "uint96" }] }] },
  { type: "function", name: "getVotes", stateMutability: "view",
    inputs: [{ name: "_account", type: "address" }],
    outputs: [{ name: "", type: "tuple[]", components: [
      { name: "recipient", type: "address" }, { name: "amount", type: "uint96" }] }] },
  { type: "function", name: "getVoter", stateMutability: "view",
    inputs: [{ name: "_account", type: "address" }],
    outputs: [{ name: "voter", type: "tuple", components: [
      { name: "account", type: "address" }, { name: "votingPower", type: "uint96" },
      { name: "votes", type: "tuple[]", components: [
        { name: "recipientId", type: "uint160" }, { name: "amount", type: "uint96" }] }] }] },
] as const;

const ZERO = "0x0000000000000000000000000000000000000000";
/** needs-claim: GoodDollar verified but no voting rights yet, so one signature claims them. not-verified: nothing to claim with.
 *  all-used: has voting power, but every vote is already on other projects. */
type Ballot = { kind: "none-to-add" | "already-voted" | "needs-claim" | "not-verified" | "all-used"; votes: { recipient: `0x${string}`; amount: bigint }[] };

/** The next vote() call this wallet should make, computed ahead of the tap so onVote() has nothing
 *  left to read: just one read (not two sequential ones) before the wallet is asked to sign, which
 *  matters on mobile WalletConnect, where extra delay between tapping and sending the request widens
 *  the window for the relay/session to drop it (wallet opens but never receives anything). */
function useNextBallot() {
  const { address } = useAccount();
  const client = usePublicClient({ chainId: celo.id });
  return useQuery({
    queryKey: ["flow-council-ballot", address],
    enabled: !!address && !!client,
    queryFn: async (): Promise<Ballot> => {
      const [voter, current] = await Promise.all([
        client!.readContract({ address: COUNCIL, abi, functionName: "getVoter", args: [address!] }),
        client!.readContract({ address: COUNCIL, abi, functionName: "getVotes", args: [address!] }),
      ]);
      const existing = current.find((v) => v.recipient.toLowerCase() === LEARNIT.toLowerCase())?.amount ?? 0n;
      if (existing > 0n) return { kind: "already-voted", votes: [] };
      if (voter.votingPower === 0n) {
        // Voting rights come from GoodDollar verification: a verified wallet can claim them with one free signature.
        const root = await client!.readContract({ address: ADDR.identity, abi: identityAbi, functionName: "getWhitelistedRoot", args: [address!] });
        return { kind: root !== ZERO ? "needs-claim" : "not-verified", votes: [] };
      }

      const others = current.filter((v) => v.recipient.toLowerCase() !== LEARNIT.toLowerCase());
      const used = others.reduce((s, v) => s + v.amount, 0n);
      const add = voter.votingPower - used < POPUP_VOTES ? voter.votingPower - used : POPUP_VOTES;
      if (add <= 0n) return { kind: "all-used", votes: [] };
      return { kind: "none-to-add", votes: [...others, { recipient: LEARNIT as `0x${string}`, amount: add }] };
    },
  });
}

/** A one-tap ballot for the GoodDollar Flow Council LearnIt is listed in. Works with any connected
 *  wallet (embedded or external) since it only uses plain wagmi hooks, same as every other
 *  on-chain action in the app. A wallet with no voting power there gets a clear message instead of
 *  a wallet popup that would only fail. */
export function VoteCard() {
  const { writeContractAsync, isPending } = useWriteContract();
  const { signMessageAsync } = useSignMessage();
  const { address } = useAccount();
  const api = useApi();
  const [claiming, setClaiming] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const { data: ballot, isLoading: checking, refetch } = useNextBallot();
  const voted = result?.ok || ballot?.kind === "already-voted";

  /** Claims voting rights: the wallet signs a free message, Flow State checks GoodDollar verification and adds the wallet as a voter.
   *  Then waits (a few seconds at most) for the chain to show the new voting power, and returns the ballot ready to send. */
  async function claimRights(): Promise<Ballot | null> {
    const issuedAt = Date.now();
    const signature = await signMessageAsync({ message: flowClaimMessage(address!, issuedAt) });
    await api("/api/flow-claim", { method: "POST", body: JSON.stringify({ address, issuedAt, signature }) });
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 2500));
      const next = (await refetch()).data;
      if (next && next.kind !== "needs-claim") return next;
    }
    return null;
  }

  async function onVote() {
    if (!ballot) return;
    setResult(null);
    if (ballot.kind === "not-verified") { setResult({ ok: false, message: "Verify with GoodDollar first. Voting rights come with a verified wallet." }); return; }
    if (ballot.kind === "all-used") { setResult({ ok: false, message: "All of this wallet's votes are already on other projects. Move 10 to LearnIt on Flow State, then vote here." }); return; }
    try {
      let b: Ballot | null = ballot;
      if (ballot.kind === "needs-claim") {
        setClaiming(true);
        b = await claimRights();
        setClaiming(false);
        if (!b) { setResult({ ok: false, message: "Your voting rights are being set up. Tap again in a moment." }); return; }
        if (b.kind === "already-voted") return;
        if (b.kind !== "none-to-add") { setResult({ ok: false, message: "Your voting rights are on, but there are no spare votes to place." }); return; }
      }
      await writeContractAsync({ address: COUNCIL, abi, functionName: "vote", chainId: celo.id, args: [b.votes] });
      setResult({ ok: true, message: "Thank you! Your vote for LearnIt is in." });
    } catch (e) {
      setClaiming(false);
      setResult({ ok: false, message: e instanceof ApiError ? e.message : friendlyError(e) });
      void refetch(); // the chain read that fed this ballot may now be stale either way
    }
  }

  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-ink">Vote for LearnIt</h2>
        <Trophy size={18} className="text-coral-600" aria-hidden />
      </div>
      <p className="mt-0.5 text-xs text-muted">
        GoodDollar's GoodBuilders Flow Council funds projects by vote. One tap puts {POPUP_VOTES.toString()} votes behind LearnIt.
      </p>
      <Button onClick={onVote} loading={isPending || checking || claiming} disabled={voted || !ballot} icon={Award} block className="mt-3">
        {voted ? "Voted" : ballot?.kind === "needs-claim" ? "Claim votes and vote for LearnIt" : "Vote for LearnIt"}
      </Button>
      {claiming && <p className="mt-2 text-xs text-muted">Sign the free message in your wallet. Then your vote goes in.</p>}
      {isPending && <p className="mt-2 text-xs text-muted">Check your wallet app. If it opened but shows nothing after a few seconds, close and reopen it, or try the tap again.</p>}
      {(result || voted) && (
        <Notice tone={voted ? "success" : "danger"} className="mt-3">
          {voted ? "Thank you! Your vote for LearnIt is in." : result?.message}
        </Notice>
      )}
    </Card>
  );
}
