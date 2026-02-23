"use client";

import { useEffect, useState } from "react";
import { Signal } from "./api/signals/route";

function fmt(n: number, decimals = 2) {
  return n.toLocaleString("en-US", { maximumFractionDigits: decimals });
}

function fmtUsd(n: number) {
  if (n >= 1_000_000_000) return `$${fmt(n / 1_000_000_000)}B`;
  if (n >= 1_000_000) return `$${fmt(n / 1_000_000)}M`;
  if (n >= 1_000) return `$${fmt(n / 1_000)}K`;
  return `$${fmt(n)}`;
}

function SignalCard({ signal }: { signal: Signal }) {
  const isUp = signal.change24h >= 0;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-3 hover:border-zinc-600 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-lg">{signal.symbol}</span>
          <span className="text-zinc-500 text-xs">PERP</span>
        </div>
        <span className={`font-semibold text-sm ${isUp ? "text-green-400" : "text-red-400"}`}>
          {isUp ? "+" : ""}{fmt(signal.change24h)}%
        </span>
      </div>

      <div className="text-zinc-100 text-2xl font-mono font-semibold">
        ${fmt(signal.price, signal.price < 1 ? 5 : 2)}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400">
        <div>
          <span className="text-zinc-500">24h Vol</span>
          <div className="text-zinc-200">{fmtUsd(signal.volume24h)}</div>
        </div>
        <div>
          <span className="text-zinc-500">Open Int</span>
          <div className="text-zinc-200">{fmtUsd(signal.openInterest)}</div>
        </div>
        <div>
          <span className="text-zinc-500">Funding</span>
          <div className={signal.fundingRate >= 0 ? "text-green-400" : "text-red-400"}>
            {signal.fundingRate >= 0 ? "+" : ""}{fmt(signal.fundingRate, 4)}%
          </div>
        </div>
        <div>
          <span className="text-zinc-500">Signal</span>
          <div className="text-yellow-400">{"⚡".repeat(Math.min(Math.ceil(signal.score / 5), 5))}</div>
        </div>
      </div>

      {signal.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {signal.tags.map((tag) => (
            <span key={tag} className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>
      )}

      <a
        href={`https://app.hyperliquid.xyz/trade/${signal.symbol}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 w-full text-center bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
      >
        Trade {signal.symbol} →
      </a>
    </div>
  );
}

export default function Home() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchSignals = async () => {
    try {
      const res = await fetch("/api/signals");
      const data = await res.json();
      setSignals(data.signals || []);
      setUpdatedAt(data.updatedAt);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignals();
    const interval = setInterval(fetchSignals, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            ⚡ tisiver
          </h1>
          <p className="text-zinc-400 mt-1 text-sm">
            Top trending Hyperliquid perps — algo-ranked by volume, momentum & funding
          </p>
          {updatedAt && (
            <p className="text-zinc-600 text-xs mt-1">
              Updated {new Date(updatedAt).toLocaleTimeString()} · auto-refreshes every 30s
            </p>
          )}
        </div>

        {/* States */}
        {loading && (
          <div className="text-zinc-500 text-center py-20">Loading signals...</div>
        )}
        {error && (
          <div className="text-red-400 text-center py-20">Failed to load signals. Retrying...</div>
        )}

        {/* Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {signals.map((s) => (
              <SignalCard key={s.symbol} signal={s} />
            ))}
          </div>
        )}

        <footer className="mt-16 text-center text-zinc-700 text-xs">
          Not financial advice. Trade at your own risk.
        </footer>
      </div>
    </main>
  );
}
