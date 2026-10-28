// Keeps one on/off state per tab so every frame in the tab stays in sync.
async function getRunning(tabId) {
	const data = await chrome.storage.session.get('running');
	return Boolean((data.running || {})[tabId]);
}

async function setRunning(tabId, value) {
	const data = await chrome.storage.session.get('running');
	const running = data.running || {};
	if (value) running[tabId] = true;
	else delete running[tabId];
	await chrome.storage.session.set({ running });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	const tabId = sender.tab && sender.tab.id;
	if (tabId === undefined) return false;
	(async () => {
		if (message.type === 'toggle') {
			const next = !(await getRunning(tabId));
			await setRunning(tabId, next);
			chrome.tabs.sendMessage(tabId, { type: 'state', running: next }).catch(() => {});
		} else if (message.type === 'stop') {
			await setRunning(tabId, false);
			chrome.tabs.sendMessage(tabId, { type: 'state', running: false }).catch(() => {});
		} else if (message.type === 'get') {
			sendResponse({ running: await getRunning(tabId) });
		}
	})();
	return message.type === 'get';
});

chrome.tabs.onRemoved.addListener((tabId) => { setRunning(tabId, false); });
