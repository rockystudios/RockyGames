(() => {
	const TOGGLE_CODE = 'F8';
	const INTERVAL_MS = 100;
	const pointer = { x: 0, y: 0, inside: false };
	let timer = null;
	let badge = null;

	function clickOnce() {
		if (!pointer.inside) return;
		const target = document.elementFromPoint(pointer.x, pointer.y);
		if (!target || target === badge) return;
		const init = { bubbles: true, cancelable: true, composed: true, clientX: pointer.x, clientY: pointer.y, button: 0 };
		target.dispatchEvent(new PointerEvent('pointerdown', { ...init, buttons: 1, pointerType: 'mouse', isPrimary: true }));
		target.dispatchEvent(new MouseEvent('mousedown', { ...init, buttons: 1 }));
		target.dispatchEvent(new PointerEvent('pointerup', { ...init, pointerType: 'mouse', isPrimary: true }));
		target.dispatchEvent(new MouseEvent('mouseup', init));
		target.dispatchEvent(new MouseEvent('click', init));
	}

	function showBadge(on) {
		if (window.top !== window) return;
		badge?.remove();
		badge = null;
		if (!on || !document.documentElement) return;
		badge = document.createElement('div');
		badge.textContent = 'Auto clicker ON (F8 to stop)';
		badge.style.cssText = 'position:fixed;right:8px;bottom:8px;z-index:2147483647;padding:6px 10px;border-radius:8px;background:#1e7f3c;color:#fff;font:600 13px sans-serif;pointer-events:none';
		document.documentElement.append(badge);
	}

	function setRunning(running) {
		if (running && timer === null) timer = setInterval(clickOnce, INTERVAL_MS);
		if (!running && timer !== null) {
			clearInterval(timer);
			timer = null;
		}
		showBadge(running);
	}

	document.addEventListener('mousemove', (event) => {
		pointer.x = event.clientX;
		pointer.y = event.clientY;
		pointer.inside = true;
	}, { capture: true, passive: true });
	document.documentElement.addEventListener('mouseleave', () => { pointer.inside = false; });

	window.addEventListener('keydown', (event) => {
		if (event.code !== TOGGLE_CODE || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
		const target = event.target;
		if (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
		event.preventDefault();
		chrome.runtime.sendMessage({ type: 'toggle' });
	}, true);

	chrome.runtime.onMessage.addListener((message) => {
		if (message.type === 'state') setRunning(message.running);
	});

	document.addEventListener('visibilitychange', () => {
		if (document.hidden && window.top === window) chrome.runtime.sendMessage({ type: 'stop' });
	});

	chrome.runtime.sendMessage({ type: 'get' }, (response) => {
		if (!chrome.runtime.lastError && response) setRunning(response.running);
	});
})();
