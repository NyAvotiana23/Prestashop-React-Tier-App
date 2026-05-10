import useCopyToClipboard from "../hooks/useCopyToClipboard.jsx";

export default function CopyButton({text}) {
    const {copy, isCopied} = useCopyToClipboard();

    return (
        <button onClick={() => copy(text)} className={"px-2 py-0.5 rounded-md bg-gray-700  text-[11px] font-mono text-gray-400"}>
            {isCopied ? "✓ Copied!" : "Copy"}
        </button>
    );
}