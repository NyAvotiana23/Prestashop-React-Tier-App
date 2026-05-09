const GROUP = ["VISITEUR", "INVITE", "CLIENT"];

const value = "Visit";
const defaultMultipleValueSeparator = "/";

const associations = value.split(defaultMultipleValueSeparator).map(
    (grp) => {
        let grpUpper = grp.toUpperCase();
        return GROUP.indexOf(grpUpper) !== -1 ? GROUP.indexOf(grpUpper) : undefined;
    }
);

console.log(associations);