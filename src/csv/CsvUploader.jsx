import React, {  useRef, useState } from "react";

export default function CsvUploader({ onFileLoaded }) {
    const inputRef = useRef(null);

    const [fileName, setFileName] = useState("");
    const handleChange = (e) => {
        const file = e.target.files[0];

        if (!file) return;

        setFileName(file.name);


        // Guard: accept only .csv files
        if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
            alert("Please upload a valid CSV file.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            onFileLoaded(text, file.name); // pass raw text up
        };
        reader.readAsText(file, "UTF-8"); // specify encoding
    };

    return (
        <div className="flex flex-row gap-10">
            <span>File : {fileName}</span>
            <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleChange}
                style={{ display: "none" }}
            />
            <button type="button" onClick={() => inputRef.current.click()}>📂 Upload CSV</button>
        </div>
    );
}
