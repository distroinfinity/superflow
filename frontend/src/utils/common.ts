export const formatNumber = (num: number) => {
    return num
        ? num >= 1000000
            ? (num / 1000000).toFixed(1) + "M"
            : num >= 1000
                ? (num / 1000).toFixed(1) + "K"
                : num.toString()
        : "...";
};
export function formatSlug(input: string): string {
    const trimmedInput = input.trim();

    if (/^\d+$/.test(trimmedInput)) {
        return 'block';
    }

    if (!trimmedInput.startsWith('0x')) {
        return 'unknown';
    }

    const strippedInput = trimmedInput.slice(2);

    if (!/^[0-9a-fA-F]+$/.test(strippedInput)) {
        return 'unknown';
    }

    if (trimmedInput.length === 42) {
        return 'address';
    }

    if (trimmedInput.length === 66) {
        return 'tx';
    }

    return 'unknown';
}
