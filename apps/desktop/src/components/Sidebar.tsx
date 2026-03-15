import { Files, Search, GitBranch, Puzzle, User, Settings } from "lucide-react";

export default function Sidebar() {
    return (
        <div className="w-16 bg-[#252526] flex flex-col items-center py-3 border-r border-[#3c3c3c]">
            <div className="flex flex-col items-center gap-4">
                <button className="p-3 text-white bg-[#37373d] rounded hover:bg-[#2a2d2e] transition-colors">
                    <Files size={24} />
                </button>
                <button className="p-3 text-[#858585] hover:text-white hover:bg-[#2a2d2e] rounded transition-colors">
                    <Search size={24} />
                </button>
                <button className="p-3 text-[#858585] hover:text-white hover:bg-[#2a2d2e] rounded transition-colors">
                    <GitBranch size={24} />
                </button>
                <button className="p-3 text-[#858585] hover:text-white hover:bg-[#2a2d2e] rounded transition-colors">
                    <Puzzle size={24} />
                </button>
            </div>
            <div className="flex-1" />
            <div className="flex flex-col items-center gap-4">
                <button className="p-3 text-[#858585] hover:text-white hover:bg-[#2a2d2e] rounded transition-colors">
                    <User size={24} />
                </button>
                <button className="p-3 text-[#858585] hover:text-white hover:bg-[#2a2d2e] rounded transition-colors">
                    <Settings size={24} />
                </button>
            </div>
        </div>
    );
}
