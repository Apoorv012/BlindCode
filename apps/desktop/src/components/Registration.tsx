import { useState } from "react";
import { Zap } from "lucide-react";

interface RegistrationProps {
    onRegister: (name: string, roll: string) => void;
}

export default function Registration({ onRegister }: RegistrationProps) {
    const [name, setName] = useState("");
    const [roll, setRoll] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim() && roll.trim()) {
            onRegister(name, roll);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0b0b] px-4">
            <div className="w-full max-w-sm rounded-xl border border-[#1f1f1f] bg-[#121212] px-6 py-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
                <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white">
                        <Zap className="h-5 w-5 text-black" />
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold text-white leading-tight" style={{ fontFamily: 'var(--font-orbitron)' }}>
                            BLIND CODE
                        </h1>
                        <p className="text-xs text-gray-500">Blind Coding Challenge</p>
                    </div>
                </div>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="mb-1 block text-xs text-gray-400">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your name"
                            className="w-full rounded-md border border-[#2a2a2a] bg-[#181818] px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-white"
                            required
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-xs text-gray-400">Roll Number</label>
                        <input
                            type="text"
                            value={roll}
                            onChange={(e) => setRoll(e.target.value)}
                            placeholder="Roll number"
                            className="w-full rounded-md border border-[#2a2a2a] bg-[#181818] px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-white"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="mt-3 w-full rounded-md bg-white py-2.5 text-sm font-semibold text-black transition hover:bg-gray-200 active:scale-[0.97]"
                    >
                        Start Game
                    </button>
                </form>

                <p className="mt-4 text-center text-[10px] text-gray-600">
                    Write code you can&apos;t see. Use Vision to peek.
                </p>
            </div>
        </div>
    );
}
