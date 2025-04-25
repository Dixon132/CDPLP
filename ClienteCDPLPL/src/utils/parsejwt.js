// named export
export function parseToken(token) {
    try {
        const [, payloadB64] = token.split('.');
        return JSON.parse(atob(payloadB64));
    } catch {
        return null;
    }
}
