(() => {
	'use strict';

	const STORAGE_KEY = 'rockyGamesEconomy';
	const SHORTCUT_BINDINGS_KEY = 'rockyGamesShortcutBindings';
	const NEWS_DISMISSED_KEY = 'rockyGamesNewsDismissed';
	const NEWS_SEEN_KEY = 'rockyGamesNewsSeen';
	const NEWS_VERSION = 'shortcuts-1';
	const GAME_REWARD = 5;
	const SHORTCUTS = [
		{ id: 'myaccess', code: 'KeyA', label: 'APSVA MyAccess', href: 'https://myaccess.apsva.us/' },
		{ id: 'sora', code: 'KeyS', label: 'Sora', href: 'https://soraapp.com/' },
		{ id: 'home', code: 'KeyH', label: 'Rocky Games home', href: 'index.html' },
		{ id: 'miniGames', code: 'KeyM', label: 'Mini-games', href: 'mini-games.html' }
	];
	const prizes = [10, 15, 20, 25, 50, 100];
	const backgrounds = [
		{ id: 'default', name: 'Neon Grid', price: 0, color: '#050b07', image: 'radial-gradient(circle at 50% -10%, #0e4b27 0, transparent 48%), linear-gradient(#3cff7a1a 1px, transparent 1px), linear-gradient(90deg, #3cff7a1a 1px, transparent 1px)', size: 'auto, 32px 32px, 32px 32px' },
		{ id: 'sunset', name: 'Sunset Pop', price: 50, color: '#ffe0c2', image: 'linear-gradient(145deg, #ffe0c2, #f6b5b5 55%, #d7c1ed)' },
		{ id: 'ocean', name: 'Cool Water', price: 75, color: '#d7f0ee', image: 'linear-gradient(135deg, #d7f0ee, #a9d6e5 55%, #c5d8f0)' },
		{ id: 'meadow', name: 'Meadow', price: 100, color: '#e2f0d1', image: 'linear-gradient(145deg, #e2f0d1, #b8d8a5 55%, #f0e8bd)' },
		{ id: 'lavender', name: 'Soft Lavender', price: 125, color: '#eee5f7', image: 'linear-gradient(135deg, #eee5f7, #d8d4f2 55%, #f7dfeb)' }
	];
	const backgroundById = new Map(backgrounds.map((background) => [background.id, background]));
	const today = () => {
		const date = new Date();
		return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
	};
	let state;
	let storageAvailable = true;
	let statusTimer;
	let shortcutBindings = Object.fromEntries(SHORTCUTS.map((shortcut) => [shortcut.id, shortcut.code]));

	function announce(message) {
		const status = document.querySelector('#rocky-economy-status');
		if (!status) return;
		status.textContent = message;
		window.clearTimeout(statusTimer);
		statusTimer = window.setTimeout(() => { status.textContent = ''; }, 5000);
	}

	function isValidState(value) {
		return value && value.version === 1
			&& Number.isSafeInteger(value.coins) && value.coins >= 0
			&& (value.lastSpin === null || /^\d{4}-\d{2}-\d{2}$/.test(value.lastSpin))
			&& Array.isArray(value.ownedBackgrounds)
			&& value.ownedBackgrounds.every((id) => backgroundById.has(id))
			&& value.ownedBackgrounds.includes('default')
			&& backgroundById.has(value.activeBackground)
			&& value.ownedBackgrounds.includes(value.activeBackground);
	}

	function readState() {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored === null) return {
			version: 1,
			coins: 0,
			lastSpin: null,
			ownedBackgrounds: ['default'],
			activeBackground: 'default'
		};
		const parsed = JSON.parse(stored);
		if (!isValidState(parsed)) throw new Error('Saved Rocky Games data is invalid. Your saved data was not changed.');
		return parsed;
	}

	function persist(next) {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
		state = next;
		applyBackground();
		render();
		return true;
	}

	function update(mutator) {
		if (!storageAvailable) {
			announce('Saving is unavailable in this browser. Nothing was changed.');
			return false;
		}
		try {
			const next = readState();
			next.ownedBackgrounds = [...next.ownedBackgrounds];
			if (!mutator(next)) return false;
			return persist(next);
		} catch (error) {
			console.error('Rocky Games could not save your data:', error);
			announce(`Could not save: ${error.message}`);
			return false;
		}
	}

	function applyBackground() {
		const background = backgroundById.get(state.activeBackground);
		document.body.style.setProperty('background-color', background.color, 'important');
		document.body.style.setProperty('background-image', background.image, 'important');
		document.body.style.setProperty('background-size', background.size || 'cover', 'important');
		document.body.style.setProperty('background-position', 'center', 'important');
		document.body.style.setProperty('background-attachment', background.size ? 'initial' : 'fixed', 'important');
	}

	function render() {
		const balance = document.querySelector('#rocky-economy-balance');
		if (balance) balance.textContent = storageAvailable ? `${state.coins} coins` : 'Coins unavailable';
		renderShop();
		renderSpin();
	}

	function renderShop() {
		const container = document.querySelector('#background-shop');
		if (!container || !state) return;
		container.replaceChildren();
		backgrounds.forEach((background) => {
			const owned = state.ownedBackgrounds.includes(background.id);
			const selected = state.activeBackground === background.id;
			const card = document.createElement('article');
			card.className = 'background-card';
			const preview = document.createElement('div');
			preview.className = 'background-preview';
			preview.style.backgroundColor = background.color;
			preview.style.backgroundImage = background.image;
			preview.style.backgroundSize = background.size || 'cover';
			const title = document.createElement('h3');
			title.textContent = background.name;
			const price = document.createElement('p');
			price.textContent = background.price === 0 ? 'Free' : `${background.price} coins`;
			const button = document.createElement('button');
			button.type = 'button';
			button.className = 'shop-button';
			button.textContent = selected ? 'Selected' : owned ? 'Use background' : `Buy for ${background.price}`;
			button.disabled = selected || !storageAvailable || (!owned && state.coins < background.price);
			button.addEventListener('click', () => {
				const changed = update((next) => {
					if (!next.ownedBackgrounds.includes(background.id)) {
						if (next.coins < background.price) {
							announce('You do not have enough coins for this background.');
							return false;
						}
						next.coins -= background.price;
						next.ownedBackgrounds.push(background.id);
					}
					next.activeBackground = background.id;
					return true;
				});
				if (changed) announce(`${background.name} is now your site background.`);
			});
			card.append(preview, title, price, button);
			container.append(card);
		});
	}

	function renderSpin() {
		const spinButton = document.querySelector('#spin-button');
		const spinStatus = document.querySelector('#spin-status');
		if (!spinButton || !spinStatus || !state) return;
		const alreadySpun = state.lastSpin === today();
		spinButton.disabled = !storageAvailable || alreadySpun;
		spinButton.textContent = alreadySpun ? 'Come back tomorrow' : 'Spin for coins';
		if (alreadySpun && !spinStatus.dataset.result) {
			spinStatus.textContent = 'Your daily spin is saved. Come back tomorrow for another one.';
		} else if (!alreadySpun) {
			spinStatus.textContent = 'One spin each day. Prizes are saved to this browser.';
			spinStatus.dataset.result = '';
		}
	}

	function spinWheel() {
		if (!storageAvailable || state.lastSpin === today()) {
			renderSpin();
			return;
		}
		const prizeIndex = Math.floor(Math.random() * prizes.length);
		const prize = prizes[prizeIndex];
		const changed = update((next) => {
			if (next.lastSpin === today()) return false;
			next.lastSpin = today();
			next.coins += prize;
			return true;
		});
		if (!changed) {
			renderSpin();
			return;
		}

		const wheel = document.querySelector('#prize-wheel');
		const spinStatus = document.querySelector('#spin-status');
		const button = document.querySelector('#spin-button');
		const targetRotation = 360 * 6 + 360 - (prizeIndex * 60 + 30);
		if (wheel) wheel.style.transform = `rotate(${targetRotation}deg)`;
		if (button) button.disabled = true;
		if (spinStatus) {
			spinStatus.dataset.result = 'pending';
			spinStatus.textContent = 'The prize is saved. The wheel is spinning…';
		}
		window.setTimeout(() => {
			if (spinStatus) {
				spinStatus.dataset.result = 'won';
				spinStatus.textContent = `You won ${prize} coins! Your new balance is ${state.coins} coins.`;
			}
		}, 4200);
	}

	function rewardGameCompletion(game) {
		const rewarded = update((next) => {
			next.coins += GAME_REWARD;
			return true;
		});
		if (rewarded) announce(`+${GAME_REWARD} coins for finishing ${game}.`);
		return rewarded;
	}

	function initializeFullscreen() {
		const target = document.querySelector('[data-game-fullscreen]');
		if (!target) return;

		const button = document.createElement('button');
		button.className = 'game-fullscreen-button';
		button.type = 'button';
		button.setAttribute('aria-label', 'Enter fullscreen');
		button.setAttribute('title', 'Enter fullscreen');
		button.setAttribute('aria-pressed', 'false');
		button.innerHTML = '<span aria-hidden="true">⛶</span>';
		target.append(button);

		const loginLink = document.createElement('a');
		loginLink.className = 'game-login-link';
		loginLink.href = 'https://myaccess.apsva.us/';
		loginLink.textContent = 'MyAccess';
		loginLink.setAttribute('aria-label', 'Open APSVA MyAccess');
		target.append(loginLink);

		function updateButton() {
			const isFullscreen = document.fullscreenElement === target || document.webkitFullscreenElement === target;
			const label = isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen';
			button.setAttribute('aria-label', label);
			button.setAttribute('title', label);
			button.setAttribute('aria-pressed', String(isFullscreen));
		}

		button.addEventListener('click', async () => {
			const isFullscreen = document.fullscreenElement === target || document.webkitFullscreenElement === target;
			const toggleFullscreen = isFullscreen
				? document.exitFullscreen || document.webkitExitFullscreen
				: target.requestFullscreen || target.webkitRequestFullscreen;
			if (!toggleFullscreen) {
				button.setAttribute('aria-label', 'Fullscreen is unavailable in this browser');
				button.setAttribute('title', 'Fullscreen is unavailable in this browser');
				return;
			}
			try {
				await toggleFullscreen.call(isFullscreen ? document : target);
			} catch (error) {
				console.error('Rocky Games could not change fullscreen mode:', error);
				button.setAttribute('aria-label', 'Fullscreen is unavailable in this browser');
				button.setAttribute('title', 'Fullscreen is unavailable in this browser');
			}
		});

		document.addEventListener('fullscreenchange', updateButton);
		document.addEventListener('webkitfullscreenchange', updateButton);
	}

	function readShortcutBindings() {
		const stored = localStorage.getItem(SHORTCUT_BINDINGS_KEY);
		if (stored === null) return Object.fromEntries(SHORTCUTS.map((shortcut) => [shortcut.id, shortcut.code]));
		const parsed = JSON.parse(stored);
		const valid = parsed && parsed.version === 1 && parsed.bindings
			&& SHORTCUTS.every((shortcut) => /^Key[A-Z]$/.test(parsed.bindings[shortcut.id] || ''))
			&& new Set(SHORTCUTS.map((shortcut) => parsed.bindings[shortcut.id])).size === SHORTCUTS.length;
		if (!valid) throw new Error('Saved shortcut settings are invalid. Your shortcuts were not changed.');
		return parsed.bindings;
	}

	function initializeShortcuts(shortcutList) {
		try {
			shortcutBindings = readShortcutBindings();
		} catch (error) {
			console.error('Rocky Games could not load saved shortcuts:', error);
			announce(`Could not load shortcuts: ${error.message}`);
		}

		let capturedShortcutId = null;
		function renderShortcutList() {
			shortcutList.replaceChildren();
			SHORTCUTS.forEach((shortcut) => {
				const item = document.createElement('li');
				const label = document.createElement('span');
				label.textContent = shortcut.label;
				const binding = document.createElement('span');
				binding.className = 'news-shortcut-binding';
				['Option', 'Shift', shortcutBindings[shortcut.id].slice(3)].forEach((key) => {
					const keycap = document.createElement('kbd');
					keycap.textContent = key;
					binding.append(keycap);
				});
				const button = document.createElement('button');
				button.type = 'button';
				button.className = 'news-shortcut-edit';
				button.textContent = capturedShortcutId === shortcut.id ? 'Press a letter…' : 'Change';
				button.setAttribute('aria-label', `Change shortcut for ${shortcut.label}`);
				button.addEventListener('click', () => {
					capturedShortcutId = shortcut.id;
					renderShortcutList();
					shortcutList.querySelector(`[data-shortcut-id="${shortcut.id}"] button`).focus();
				});
				item.dataset.shortcutId = shortcut.id;
				item.append(label, binding, button);
				shortcutList.append(item);
			});
		}

		document.addEventListener('keydown', (event) => {
			if (capturedShortcutId) {
				if (event.code === 'Escape') {
					event.preventDefault();
					capturedShortcutId = null;
					renderShortcutList();
					return;
				}
				if (!/^Key[A-Z]$/.test(event.code) || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
				event.preventDefault();
				const conflict = SHORTCUTS.find((shortcut) => shortcut.id !== capturedShortcutId && shortcutBindings[shortcut.id] === event.code);
				if (conflict) {
					announce(`${event.code.slice(3)} is already assigned to ${conflict.label}. Choose another letter.`);
					return;
				}
				const shortcut = SHORTCUTS.find((item) => item.id === capturedShortcutId);
				const nextBindings = { ...shortcutBindings, [capturedShortcutId]: event.code };
				try {
					localStorage.setItem(SHORTCUT_BINDINGS_KEY, JSON.stringify({ version: 1, bindings: nextBindings }));
					shortcutBindings = nextBindings;
					capturedShortcutId = null;
					renderShortcutList();
					announce(`${shortcut.label} shortcut saved on this device.`);
				} catch (error) {
					console.error('Rocky Games could not save shortcut settings:', error);
					announce(`Could not save shortcut: ${error.message}`);
				}
				return;
			}

			if (!event.altKey || !event.shiftKey || event.ctrlKey || event.metaKey || event.repeat || event.isComposing) return;

			const activeElement = document.activeElement;
			if (activeElement instanceof HTMLElement && (
				activeElement.isContentEditable
				|| ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement.tagName)
			)) return;

			const shortcut = SHORTCUTS.find((item) => shortcutBindings[item.id] === event.code);
			if (!shortcut) return;
			event.preventDefault();
			window.location.assign(new URL(shortcut.href, window.location.href).href);
		});
		window.addEventListener('storage', (event) => {
			if (event.key !== SHORTCUT_BINDINGS_KEY) return;
			try {
				shortcutBindings = readShortcutBindings();
				renderShortcutList();
			} catch (error) {
				console.error('Rocky Games could not refresh saved shortcuts:', error);
				announce(`Could not refresh shortcuts: ${error.message}`);
			}
		});
		return renderShortcutList;
	}

	function isNewsDismissed() {
		try {
			return localStorage.getItem(NEWS_DISMISSED_KEY) === NEWS_VERSION
				|| localStorage.getItem(NEWS_SEEN_KEY) === NEWS_VERSION;
		} catch (error) {
			console.error('Rocky Games could not read the news preference:', error);
			announce(`Could not read news preference: ${error.message}`);
			return false;
		}
	}

	function initializeWhatsNew(shortcutList, renderShortcutList) {
		const dialog = document.createElement('dialog');
		dialog.className = 'login-reminder news-reminder';
		dialog.setAttribute('aria-labelledby', 'news-reminder-title');
		dialog.innerHTML = `
			<p class="login-reminder-kicker">Rocky Games update</p>
			<h2 id="news-reminder-title">We just added more shortcuts!</h2>
			<section class="news-intro">
				<p>Get where you want to go faster with these new keyboard shortcuts. Press Option + Shift and a letter any time while you are on Rocky Games.</p>
				<div class="news-actions">
					<button class="login-reminder-button" type="button" data-news-action="show-shortcuts">Show me</button>
					<button class="login-reminder-button news-secondary-button" type="button" data-news-action="close" autofocus>Great!</button>
				</div>
			</section>
			<section class="news-shortcuts" hidden aria-labelledby="news-shortcuts-title">
				<h3 id="news-shortcuts-title" tabindex="-1">Your shortcuts</h3>
				<p>Change a shortcut by clicking Change, then pressing an unused letter. Press Escape to cancel. Your choices are saved on this device.</p>
				<ul class="news-shortcut-list"></ul>
				<div class="news-actions">
					<button class="login-reminder-button news-secondary-button" type="button" data-news-action="back">Back</button>
					<button class="login-reminder-button" type="button" data-news-action="close">Great!</button>
				</div>
			</section>
			<label class="news-preference"><input type="checkbox"> Don't show me this news again</label>
		`;
		document.body.append(dialog);
		shortcutList.className = 'news-shortcut-list';
		dialog.querySelector('.news-shortcut-list').replaceWith(shortcutList);
		renderShortcutList();

		const checkbox = dialog.querySelector('.news-preference input');
		try {
			checkbox.checked = localStorage.getItem(NEWS_DISMISSED_KEY) === NEWS_VERSION;
		} catch (error) {
			console.error('Rocky Games could not read the news display preference:', error);
			announce(`Could not read news preference: ${error.message}`);
		}

		let newsPreferenceChanged = false;
		checkbox.addEventListener('change', () => {
			newsPreferenceChanged = true;
			try {
				if (checkbox.checked) {
					localStorage.setItem(NEWS_DISMISSED_KEY, NEWS_VERSION);
					localStorage.removeItem(NEWS_SEEN_KEY);
				} else {
					localStorage.removeItem(NEWS_DISMISSED_KEY);
					localStorage.removeItem(NEWS_SEEN_KEY);
				}
			} catch (error) {
				console.error('Rocky Games could not save the news display preference:', error);
				announce(`Could not save news preference: ${error.message}`);
			}
		});

		function saveNewsView() {
			if (checkbox.checked || newsPreferenceChanged) return;
			try {
				localStorage.setItem(NEWS_SEEN_KEY, NEWS_VERSION);
			} catch (error) {
				console.error('Rocky Games could not save the news view:', error);
				announce(`Could not save news preference: ${error.message}`);
			}
		}
		dialog.addEventListener('cancel', saveNewsView);

		dialog.querySelector('[data-news-action="show-shortcuts"]').addEventListener('click', () => {
			dialog.querySelector('.news-intro').hidden = true;
			dialog.querySelector('.news-shortcuts').hidden = false;
			dialog.scrollTop = 0;
			dialog.querySelector('#news-shortcuts-title').focus();
		});
		dialog.querySelector('[data-news-action="back"]').addEventListener('click', () => {
			dialog.querySelector('.news-shortcuts').hidden = true;
			dialog.querySelector('.news-intro').hidden = false;
			dialog.scrollTop = 0;
			dialog.querySelector('[data-news-action="show-shortcuts"]').focus();
		});
		dialog.querySelectorAll('[data-news-action="close"]').forEach((button) => {
			button.addEventListener('click', () => {
				saveNewsView();
				dialog.close();
			});
		});

		function showWhatsNew() {
			if (dialog.open) return;
			if (typeof dialog.showModal === 'function') {
				try {
					dialog.showModal();
					return;
				} catch (error) {
					console.error('Rocky Games could not open the news dialog as a modal:', error);
				}
			}
			dialog.setAttribute('open', '');
		}

		document.querySelector('#whats-new-help').addEventListener('click', (event) => {
			event.preventDefault();
			showWhatsNew();
		});
		if (!isNewsDismissed()) showWhatsNew();
	}

	function initialize() {
		initializeFullscreen();
		const toolbar = document.createElement('nav');
		toolbar.id = 'rocky-economy-toolbar';
		toolbar.setAttribute('aria-label', 'Rocky Games shortcuts and wallet');
		toolbar.innerHTML = '<span id="rocky-economy-balance" aria-live="polite"></span><a href="shop.html#daily-spin">Daily spin</a><a href="shop.html#background-shop">Background shop</a><a href="#whats-new" id="whats-new-help">What\'s new</a><span id="rocky-economy-status" role="status" aria-live="polite"></span>';
		document.body.append(toolbar);
		const shortcutList = document.createElement('ul');
		const renderShortcutList = initializeShortcuts(shortcutList);
		initializeWhatsNew(shortcutList, renderShortcutList);
		document.querySelector('#spin-button')?.addEventListener('click', spinWheel);

		try {
			state = readState();
			if (localStorage.getItem(STORAGE_KEY) === null) persist(state);
			else {
				applyBackground();
				render();
			}
		} catch (error) {
			storageAvailable = false;
			console.error('Rocky Games could not load saved data:', error);
			announce(`Could not load saved data: ${error.message}`);
			state = { version: 1, coins: 0, lastSpin: null, ownedBackgrounds: ['default'], activeBackground: 'default' };
			render();
		}
	}

	window.addEventListener('storage', (event) => {
		if (event.key !== STORAGE_KEY) return;
		try {
			state = readState();
			applyBackground();
			render();
		} catch (error) {
			storageAvailable = false;
			console.error('Rocky Games could not refresh saved data:', error);
			announce(`Could not refresh saved data: ${error.message}`);
			render();
		}
	});

	window.RockyEconomy = { rewardGameCompletion };
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
	else initialize();
})();
