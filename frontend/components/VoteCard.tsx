"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { celo } from "wagmi/chains";
import { friendlyError } from "@/lib/txErrors";
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

/** Whether this wallet already has any votes on LearnIt, read straight from the chain so a page
 *  reload doesn't forget it (a client-only flag would). */
function useAlreadyVoted() {
  const { address } = useAccount();
  const client = usePublicClient({ chainId: celo.id });
  return useQuery({
    queryKey: ["flow-council-voted", address],
    enabled: !!address && !!client,
    queryFn: async () => {
      const current = await client!.readContract({ address: COUNCIL, abi, functionName: "getVotes", args: [address!] });
      return (current.find((v) => v.recipient.toLowerCase() === LEARNIT.toLowerCase())?.amount ?? 0n) > 0n;
    },
  });
}

/** A one-tap ballot for the GoodDollar Flow Council LearnIt is listed in. Works with any connected
 *  wallet (embedded or external) since it only uses plain wagmi hooks, same as every other
 *  on-chain action in the app. A wallet with no voting power there gets a clear message instead of
 *  a wallet popup that would only fail. */
export function VoteCard() {
  const { address } = useAccount();
  const client = usePublicClient({ chainId: celo.id });
  const { writeContractAsync, isPending } = useWriteContract();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const { data: alreadyVoted, isLoading: checking } = useAlreadyVoted();
  const voted = result?.ok || alreadyVoted === true;

  async function onVote() {
    if (!address || !client) return;
    setResult(null);
    try {
      const voter = await client.readContract({ address: COUNCIL, abi, functionName: "getVoter", args: [address] });
      if (voter.votingPower === 0n) { setResult({ ok: false, message: "This wallet has no voting power in the Flow Council, so it can't vote." }); return; }

      const current = await client.readContract({ address: COUNCIL, abi, functionName: "getVotes", args: [address] });
      const others = current.filter((v) => v.recipient.toLowerCase() !== LEARNIT.toLowerCase());
      const used = others.reduce((s, v) => s + v.amount, 0n);
      const add = voter.votingPower - used < POPUP_VOTES ? voter.votingPower - used : POPUP_VOTES;
      if (add <= 0n) { setResult({ ok: false, message: "This wallet's voting power is already fully used on other projects." }); return; }

      const ballot = [...others, { recipient: LEARNIT as `0x${string}`, amount: add }];
      await writeContractAsync({ address: COUNCIL, abi, functionName: "vote", chainId: celo.id, args: [ballot] });
      setResult({ ok: true, message: "Thank you! Your vote for LearnIt is in." });
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
        GoodDollar's GoodBuilders Flow Council funds projects by vote. One tap puts {POPUP_VOTES.toString()} votes behind LearnIt.
      </p>
      <Button onClick={onVote} loading={isPending || checking} disabled={voted} icon={Award} block className="mt-3">
        {voted ? "Voted" : "Vote for LearnIt"}
      </Button>
      {(result || voted) && (
        <Notice tone={voted ? "success" : "danger"} className="mt-3">
          {voted ? "Thank you! Your vote for LearnIt is in." : result?.message}
        </Notice>
      )}
    </Card>
  );
}
