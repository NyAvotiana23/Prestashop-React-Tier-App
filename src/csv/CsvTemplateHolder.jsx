import React from "react";

function CsvTemplateHolder({headers, delimiter , outputName}) {

    if (!outputName.endsWith(".csv")) {
        throw new Error("Csv incorect");
    }
    function handleDownloadCsvTemplate() {
        const csvHeadersString = `${headers.join(delimiter)}\n`;

        const blob = new Blob([csvHeadersString], {
            type: "text/csv;charset=utf-8;",
        });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            // Check for browser support
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", outputName);
            link.style.visibility = "hidden";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
    return (
        <button type={"button"} onClick={handleDownloadCsvTemplate}>
            Download template
        </button>
    );
}

export default CsvTemplateHolder;
