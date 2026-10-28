(function () {
	const CODE_HASHES = ['3bd3f6a02801eb13bf7ab1c1b4d9c06910e2dae43d93d619d9bfe61a790ea75e'];

	async function isValidAccessCode(value) {
		const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value).trim()));
		const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
		return CODE_HASHES.includes(hash);
	}

	window.RockyAccess = { isValidAccessCode };
})();
