"use client";
import { useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { celo } from "wagmi/chains";
import { friendlyError } from "@/lib/txErrors";
import { Award, Trophy } from "@/components/icons";
import { Button, Card, Notice } from "./ui";

// GoodDollar's "GoodBuilders" Flow Council: Celo wallets with voting power there choose how a funding
// pool gets split among projects. One tap adds 10 votes to LearnIt, on top of whatever this wallet
// already has on other projects (a ballot is additive, so repeat taps keep raising LearnIt's share
// until voting power runs out).
const COUNCIL = "0x889e0aADaA3F8B28A794ef70dA147827C620a590";
const LEARNIT = "0x6dd5bf59F6bc4b2776c6891bF5C54198BFFA14C3";
const POPUP_VOTES = 10n;
const COUNCIL_URL = "https://flowstate.network/flow-councils/42220/0x889e0aadaa3f8b28a794ef70da147827c620a590";

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

/** A one-tap ballot for the GoodDollar Flow Council LearnIt is listed in. Works with any connected
 *  wallet (embedded or external) since it only uses plain wagmi hooks, same as every other
 *  on-chain action in the app. A wallet with no voting power there gets a clear message instead of
 *  a wallet popup that would only fail. */
export function VoteCard() {
  const { address } = useAccount();
  const client = usePublicClient({ chainId: celo.id });
  const { writeContractAsync, isPending } = useWriteContract();
  const [result, setResult] = useState<{ ok: boolean; message: string; votes?: bigint } | null>(null);

  async function onVote() {
    if (!address || !client) return;
    setResult(null);
    try {
      const voter = await client.readContract({ address: COUNCIL, abi, functionName: "getVoter", args: [address] });
      if (voter.votingPower === 0n) { setResult({ ok: false, message: "This wallet has no voting power in the Flow Council, so it can't vote." }); return; }

      const current = await client.readContract({ address: COUNCIL, abi, functionName: "getVotes", args: [address] });
      const others = current.filter((v) => v.recipient.toLowerCase() !== LEARNIT.toLowerCase());
      const existing = current.find((v) => v.recipient.toLowerCase() === LEARNIT.toLowerCase())?.amount ?? 0n;

      const addable = voter.votingPower - others.reduce((s, v) => s + v.amount, 0n) - existing;
      const add = addable < POPUP_VOTES ? addable : POPUP_VOTES;
      if (add <= 0n) { setResult({ ok: false, message: "This wallet's voting power is already fully used on other projects." }); return; }

      const newAmount = existing + add;
      const ballot = [...others, { recipient: LEARNIT as `0x${string}`, amount: newAmount }];
      await writeContractAsync({ address: COUNCIL, abi, functionName: "vote", chainId: celo.id, args: [ballot] });
      setResult({ ok: true, message: "Thank you! Your vote for LearnIt is in.", votes: newAmount });
    } catch (e) {
      setResult({ ok: false, message: friendlyError(e) });
    }
  }

  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-ink">Vote for LearnIt</h2>
        <Trophy size={18} className="text-coral-600" aria-hidden />
      </div>
      <p className="mt-0.5 text-xs text-muted">
        GoodDollar's GoodBuilders Flow Council funds projects by vote. One tap puts {POPUP_VOTES.toString()} more votes behind LearnIt.
      </p>
      <Button onClick={onVote} loading={isPending} icon={Award} block className="mt-3">
        {result?.ok ? "Vote again" : "Vote for LearnIt"}
      </Button>
      {result && (
        <Notice tone={result.ok ? "success" : "danger"} className="mt-3">
          {result.message}
          {result.ok && result.votes !== undefined && ` LearnIt now has ${result.votes.toString()} of your votes.`}
        </Notice>
      )}
      <a href={COUNCIL_URL} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs text-muted underline hover:text-ink">
        View the full council and ballot
      </a>
    </Card>
  );
}
