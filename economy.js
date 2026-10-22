(() => {
	'use strict';

	const STORAGE_KEY = 'rockyGamesEconomy';
	const SHORTCUT_BINDINGS_KEY = 'rockyGamesShortcutBindings';
	const SHORTCUT_URLS_KEY = 'rockyGamesShortcutUrls';
	const CUSTOM_SHORTCUTS_KEY = 'rockyGamesCustomShortcuts';
	const NEWS_DISMISSED_KEY = 'rockyGamesNewsDismissed';
	const NEWS_SEEN_KEY = 'rockyGamesNewsSeen';
	const NEWS_VERSION = 'chance-arcade-1';
	const ACCESS_GRANTED_KEY = 'rockyGamesAccessGranted';
	const ACCESS_CODE = 'RUOK67';
	const GAME_REWARD = 5;
	const SHORTCUTS = [
		{ id: 'myaccess', code: 'KeyA', label: 'APSVA MyAccess', href: 'https://myaccess.apsva.us/' },
		{ id: 'sora', code: 'KeyS', label: 'Sora', href: 'https://soraapp.com/' },
		{ id: 'home', code: 'KeyH', label: 'Rocky Games home', href: 'index.html' },
		{ id: 'miniGames', code: 'KeyM', label: 'Mini-games', href: 'mini-games.html' }
	];
	const prizes = [10, 15, 20, 25, 50, 100];
	const backgrounds = [
		{ id: 'default', name: 'Neon Grid', price: 0, dark: true, color: '#050b07', text: '#d7ffe1', muted: '#91cba0', foreground: '#09150d', foregroundText: '#d7ffe1', foregroundMuted: '#91cba0', accent: '#65ff88', accentText: '#041008', border: '#28613a', image: 'radial-gradient(circle at 50% -10%, #0e4b27 0, transparent 48%), linear-gradient(#3cff7a1a 1px, transparent 1px), linear-gradient(90deg, #3cff7a1a 1px, transparent 1px)', size: 'auto, 32px 32px, 32px 32px' },
		{ id: 'sunset', name: 'Sunset Pop', price: 50, dark: false, color: '#ffe0c2', text: '#202522', muted: '#52645b', foreground: '#fffaf2', foregroundText: '#202522', foregroundMuted: '#52645b', accent: '#a63824', accentText: '#ffffff', border: '#b36c4c', image: 'linear-gradient(145deg, #ffe0c2, #f6b5b5 55%, #d7c1ed)' },
		{ id: 'ocean', name: 'Cool Water', price: 75, dark: false, color: '#d7f0ee', text: '#162a33', muted: '#385461', foreground: '#f5ffff', foregroundText: '#162a33', foregroundMuted: '#385461', accent: '#176477', accentText: '#ffffff', border: '#548b91', image: 'linear-gradient(135deg, #d7f0ee, #a9d6e5 55%, #c5d8f0)' },
		{ id: 'meadow', name: 'Meadow', price: 100, dark: false, color: '#e2f0d1', text: '#1d301d', muted: '#405b3e', foreground: '#f8fff1', foregroundText: '#1d301d', foregroundMuted: '#405b3e', accent: '#376c38', accentText: '#ffffff', border: '#77936b', image: 'linear-gradient(145deg, #e2f0d1, #b8d8a5 55%, #f0e8bd)' },
		{ id: 'lavender', name: 'Soft Lavender', price: 125, dark: false, color: '#eee5f7', text: '#30243a', muted: '#554763', foreground: '#fffaff', foregroundText: '#30243a', foregroundMuted: '#554763', accent: '#624087', accentText: '#ffffff', border: '#9987ad', image: 'linear-gradient(135deg, #eee5f7, #d8d4f2 55%, #f7dfeb)' },
		{ id: 'midnight', name: 'Midnight Blue', price: 150, dark: true, color: '#101b32', text: '#edf3ff', muted: '#b6c9e8', foreground: '#192844', foregroundText: '#edf3ff', foregroundMuted: '#b6c9e8', accent: '#76c8f5', accentText: '#10243a', border: '#54759c', image: 'radial-gradient(circle at 75% 18%, #334d79, transparent 38%), linear-gradient(145deg, #101b32, #152747 60%, #263a5d)' },
		{ id: 'berry', name: 'Berry Blush', price: 175, dark: false, color: '#f7dce8', text: '#351d2a', muted: '#654052', foreground: '#fff7fa', foregroundText: '#351d2a', foregroundMuted: '#654052', accent: '#a32e5a', accentText: '#ffffff', border: '#b77a92', image: 'linear-gradient(145deg, #f7dce8, #f2c5d4 50%, #ead7f2)' },
		{ id: 'citrus', name: 'Citrus Cream', price: 200, dark: false, color: '#fff2bc', text: '#352c13', muted: '#62562e', foreground: '#fffbe6', foregroundText: '#352c13', foregroundMuted: '#62562e', accent: '#756018', accentText: '#ffffff', border: '#aa9146', image: 'linear-gradient(145deg, #fff2bc, #f7dc83 55%, #e7edb0)' },
		{ id: 'forest', name: 'Forest Canopy', price: 225, dark: true, color: '#10261c', text: '#e7f5e9', muted: '#b5d1bd', foreground: '#193629', foregroundText: '#e7f5e9', foregroundMuted: '#b5d1bd', accent: '#8ed7a4', accentText: '#10261c', border: '#47745a', image: 'radial-gradient(circle at 20% 12%, #436a45, transparent 35%), linear-gradient(145deg, #10261c, #183e2b 60%, #24503a)' },
		{ id: 'starlight', name: 'Starlight', price: 250, dark: false, color: '#e5eaf3', text: '#1f293b', muted: '#4b596e', foreground: '#f8faff', foregroundText: '#1f293b', foregroundMuted: '#4b596e', accent: '#394f78', accentText: '#ffffff', border: '#8491a7', image: 'radial-gradient(circle at 78% 14%, #ffffff 0 1px, transparent 2px), radial-gradient(circle at 20% 68%, #ffffff 0 1px, transparent 2px), linear-gradient(145deg, #e5eaf3, #cbd5e5 55%, #b8c4d8)' }
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
	let shortcutUrls = {};
	let customShortcuts = [];

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
		document.body.style.setProperty('color', background.text, 'important');
		document.documentElement.style.setProperty('color-scheme', background.dark ? 'dark' : 'light', 'important');
		document.documentElement.style.setProperty('--site-text-color', background.text);
		document.documentElement.style.setProperty('--site-link-color', background.text);
		document.documentElement.style.setProperty('--site-muted-text-color', background.muted);
		document.documentElement.style.setProperty('--site-foreground-color', background.foreground);
		document.documentElement.style.setProperty('--site-foreground-text-color', background.foregroundText);
		document.documentElement.style.setProperty('--site-foreground-muted-color', background.foregroundMuted);
		document.documentElement.style.setProperty('--site-accent-color', background.accent);
		document.documentElement.style.setProperty('--site-accent-text-color', background.accentText);
		document.documentElement.style.setProperty('--site-border-color', background.border);
		document.documentElement.style.setProperty('--ink', background.text, 'important');
		document.documentElement.style.setProperty('--paper', background.foreground, 'important');
		document.documentElement.style.setProperty('--lime', background.accent, 'important');
		document.documentElement.style.setProperty('--orange', background.accent, 'important');
		document.documentElement.style.setProperty('--blue', background.accent, 'important');
		document.documentElement.style.setProperty('--panel', background.foreground, 'important');
	}

	function render() {
		const balance = document.querySelector('#rocky-economy-balance');
		if (balance) balance.textContent = storageAvailable ? `${state.coins} coins` : 'Coins unavailable';
		renderShop();
		renderSpin();
		renderWager();
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

	function renderWager() {
		const amountInput = document.querySelector('#wager-amount');
		const button = document.querySelector('#wager-button');
		if (!amountInput || !button || !state) return;
		amountInput.max = String(state.coins);
		const amount = amountInput.valueAsNumber;
		button.disabled = !storageAvailable || !Number.isSafeInteger(amount) || amount <= 0 || amount > state.coins;
	}

	function wagerCoins(amount) {
		if (!storageAvailable || !Number.isSafeInteger(amount) || amount <= 0) {
			announce('Enter a whole-number coin wager greater than zero.');
			return;
		}
		let won = false;
		const changed = update((next) => {
			if (amount > next.coins) {
				announce('You do not have enough coins for that wager.');
				return false;
			}
			if (amount > Number.MAX_SAFE_INTEGER - next.coins) {
				announce('That wager would exceed your wallet limit if you won. Try a smaller amount.');
				return false;
			}
			won = Math.random() < 0.5;
			next.coins += won ? amount : -amount;
			return true;
		});
		if (!changed) return;
		const status = document.querySelector('#wager-status');
		if (status) status.textContent = won
			? `You won! Your ${amount}-coin wager doubled. New balance: ${state.coins} coins.`
			: `Not this time—you lost ${amount} coins. New balance: ${state.coins} coins.`;
	}

	function randomIndex(length) {
		const range = 0x100000000;
		const limit = range - (range % length);
		const values = new Uint32Array(1);
		let value;
		do {
			window.crypto.getRandomValues(values);
			value = values[0];
		} while (value >= limit);
		return value % length;
	}

	function playChanceGame(gameId, amount, choice) {
		const games = {
			coin: { maxWinnings: 1 },
			seven: { maxWinnings: 5 },
			wheel: { maxWinnings: 7 }
		};
		const game = games[gameId];
		if (!game || !Number.isSafeInteger(amount) || amount < 1 || amount > 10) {
			announce('Choose a valid game and wager from 1 to 10 coins.');
			return null;
		}
		if (!storageAvailable || !state) {
			announce('Your coin balance is unavailable. No game was played.');
			return null;
		}
		if (amount > state.coins) {
			announce('You do not have enough coins for that wager.');
			return null;
		}
		if (gameId === 'coin' && !['heads', 'tails'].includes(choice)) {
			announce('Choose heads or tails before playing.');
			return null;
		}
		let outcome;
		try {
			if (gameId === 'coin') {
				outcome = randomIndex(2) === 0 ? 'heads' : 'tails';
			} else if (gameId === 'seven') {
				outcome = randomIndex(6) + randomIndex(6) + 2;
			} else {
				outcome = randomIndex(8);
			}
		} catch (error) {
			console.error('Rocky Games could not generate a chance-game result:', error);
			announce('A fair result could not be generated. No coins were changed.');
			return null;
		}
		const won = gameId === 'coin' ? outcome === choice
			: gameId === 'seven' ? outcome === 7
				: outcome === 0;
		const netCoins = won ? amount * game.maxWinnings : -amount;
		let balance = 0;
		const changed = update((next) => {
			if (amount > next.coins) {
				announce('You do not have enough coins for that wager.');
				return false;
			}
			if (!Number.isSafeInteger(next.coins + netCoins)) {
				announce('That win would exceed your wallet limit. Try a smaller wager.');
				return false;
			}
			next.coins += netCoins;
			balance = next.coins;
			return true;
		});
		if (!changed) return null;
		return { gameId, outcome, won, netCoins, balance };
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

		const shortcutMenu = document.createElement('div');
		shortcutMenu.className = 'game-shortcut-menu';
		const shortcutMenuButton = document.createElement('button');
		shortcutMenuButton.className = 'game-shortcut-menu-button';
		shortcutMenuButton.type = 'button';
		shortcutMenuButton.textContent = 'Shortcuts';
		shortcutMenuButton.setAttribute('aria-expanded', 'false');
		const shortcutMenuList = document.createElement('nav');
		shortcutMenuList.className = 'game-shortcut-menu-list';
		shortcutMenuList.setAttribute('aria-label', 'Keyboard shortcuts');
		shortcutMenuList.hidden = true;
		shortcutMenu.append(shortcutMenuButton, shortcutMenuList);
		target.append(shortcutMenu);

		shortcutMenuButton.addEventListener('click', () => {
			shortcutMenuList.hidden = !shortcutMenuList.hidden;
			shortcutMenuButton.setAttribute('aria-expanded', String(!shortcutMenuList.hidden));
		});

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

	function parseShortcutUrl(value) {
		const url = new URL(value);
		if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Use a URL that starts with http:// or https://.');
		return url.href;
	}

	function readShortcutUrls() {
		const stored = localStorage.getItem(SHORTCUT_URLS_KEY);
		if (stored === null) return {};
		const parsed = JSON.parse(stored);
		if (!parsed || parsed.version !== 1 || !parsed.urls
			|| Object.entries(parsed.urls).some(([id, url]) => !SHORTCUTS.some((shortcut) => shortcut.id === id) || typeof url !== 'string' || parseShortcutUrl(url) !== url)) {
			throw new Error('Saved shortcut URLs are invalid. Your shortcuts were not changed.');
		}
		return parsed.urls;
	}

	function readCustomShortcuts() {
		const stored = localStorage.getItem(CUSTOM_SHORTCUTS_KEY);
		if (stored === null) return [];
		const parsed = JSON.parse(stored);
		const valid = parsed && parsed.version === 1 && Array.isArray(parsed.shortcuts)
			&& parsed.shortcuts.every((shortcut) => shortcut && /^custom-[a-z0-9-]+$/.test(shortcut.id)
				&& typeof shortcut.label === 'string' && shortcut.label.trim() && shortcut.label.length <= 60
				&& typeof shortcut.href === 'string' && parseShortcutUrl(shortcut.href) === shortcut.href
				&& /^Key[A-Z]$/.test(shortcut.code))
			&& new Set(parsed.shortcuts.map((shortcut) => shortcut.id)).size === parsed.shortcuts.length
			&& new Set(parsed.shortcuts.map((shortcut) => shortcut.code)).size === parsed.shortcuts.length
			&& parsed.shortcuts.every((shortcut) => !SHORTCUTS.some((builtin) => shortcutBindings[builtin.id] === shortcut.code));
		if (!valid) throw new Error('Saved custom shortcuts are invalid. Your shortcuts were not changed.');
		return parsed.shortcuts;
	}

	function getShortcuts() {
		return [
			...SHORTCUTS.map((shortcut) => ({
				...shortcut,
				code: shortcutBindings[shortcut.id],
				href: shortcutUrls[shortcut.id] || shortcut.href
			})),
			...customShortcuts
		];
	}

	function initializeShortcuts(shortcutList) {
		try {
			shortcutBindings = readShortcutBindings();
			shortcutUrls = readShortcutUrls();
			customShortcuts = readCustomShortcuts();
		} catch (error) {
			console.error('Rocky Games could not load saved shortcuts:', error);
			announce(`Could not load shortcuts: ${error.message}`);
		}

		function storeCustomShortcuts(nextShortcuts) {
			localStorage.setItem(CUSTOM_SHORTCUTS_KEY, JSON.stringify({ version: 1, shortcuts: nextShortcuts }));
			customShortcuts = nextShortcuts;
		}

		function renderShortcutList() {
			shortcutList.replaceChildren();
			const shortcuts = getShortcuts();
			document.querySelectorAll('.game-shortcut-menu-list').forEach((menu) => {
				menu.replaceChildren();
				shortcuts.forEach((shortcut) => {
					const link = document.createElement('a');
					link.href = new URL(shortcut.href, window.location.href).href;
					link.textContent = `${shortcut.label} (⌥⇧${shortcut.code.slice(3)})`;
					menu.append(link);
				});
			});
			shortcuts.forEach((shortcut) => {
				const item = document.createElement('li');
				item.classList.add('news-shortcut-item');
				item.dataset.shortcutId = shortcut.id;
				const details = document.createElement('div');
				details.className = 'news-shortcut-details';
				const title = document.createElement('strong');
				title.textContent = shortcut.label;
				const nameLabel = document.createElement('label');
				nameLabel.className = 'news-shortcut-label';
				nameLabel.textContent = 'Name';
				const labelInput = document.createElement('input');
				labelInput.type = 'text';
				labelInput.value = shortcut.label;
				labelInput.maxLength = 60;
				labelInput.disabled = !shortcut.id.startsWith('custom-');
				labelInput.id = `shortcut-name-${shortcut.id}`;
				nameLabel.htmlFor = labelInput.id;
				labelInput.setAttribute('aria-label', `${shortcut.label} shortcut name`);
				const urlLabel = document.createElement('label');
				urlLabel.className = 'news-shortcut-label';
				urlLabel.textContent = 'URL';
				const urlInput = document.createElement('input');
				urlInput.type = 'url';
				urlInput.value = shortcut.href;
				urlInput.required = true;
				urlInput.id = `shortcut-url-${shortcut.id}`;
				urlLabel.htmlFor = urlInput.id;
				urlInput.setAttribute('aria-label', `${shortcut.label} shortcut URL`);
				const urlForm = document.createElement('form');
				urlForm.className = 'news-shortcut-url-form';
				const nameField = document.createElement('div');
				nameField.append(nameLabel, labelInput);
				if (shortcut.id.startsWith('custom-')) details.append(nameField);
				else details.append(title);
				urlForm.addEventListener('submit', (event) => {
					event.preventDefault();
					try {
						const href = parseShortcutUrl(urlInput.value.trim());
						if (shortcut.id.startsWith('custom-')) {
							const labelValue = labelInput.value.trim();
							if (!labelValue || labelValue.length > 60) throw new Error('Enter a name of 1 to 60 characters.');
							storeCustomShortcuts(customShortcuts.map((entry) => entry.id === shortcut.id ? { ...entry, label: labelValue, href } : entry));
						} else {
							const nextUrls = { ...shortcutUrls, [shortcut.id]: href };
							localStorage.setItem(SHORTCUT_URLS_KEY, JSON.stringify({ version: 1, urls: nextUrls }));
							shortcutUrls = nextUrls;
						}
						announce(`${shortcut.label} URL saved on this device.`);
						renderShortcutList();
					} catch (error) {
						console.error('Rocky Games could not save a shortcut URL:', error);
						announce(`Could not save shortcut URL: ${error.message}`);
					}
				});
				const urlField = document.createElement('div');
				urlField.append(urlLabel, urlInput);
				urlForm.append(urlField);
				const urlSave = document.createElement('button');
				urlSave.type = 'submit';
				urlSave.className = 'news-shortcut-edit';
				urlSave.textContent = 'Save URL';
				urlForm.append(urlSave);
				details.append(urlForm);
				const binding = document.createElement('span');
				binding.className = 'news-shortcut-binding';
				['Option', 'Shift', shortcut.code.slice(3)].forEach((key) => {
					const keycap = document.createElement('kbd');
					keycap.textContent = key;
					binding.append(keycap);
				});
				const button = document.createElement('button');
				button.type = 'button';
				button.className = 'news-shortcut-edit';
				button.textContent = 'Change key';
				button.setAttribute('aria-label', `Change shortcut key for ${shortcut.label}`);
				button.addEventListener('click', () => {
					const letter = window.prompt(`Enter a new letter for ${shortcut.label} (Option + Shift + letter):`, shortcut.code.slice(3));
					if (letter === null) return;
					const code = `Key${letter.trim().toUpperCase()}`;
					if (!/^Key[A-Z]$/.test(code)) {
						announce('Choose one letter from A to Z.');
						return;
					}
					const conflict = getShortcuts().find((entry) => entry.id !== shortcut.id && entry.code === code);
					if (conflict) {
						announce(`${code.slice(3)} is already assigned to ${conflict.label}. Choose another letter.`);
						return;
					}
					try {
						if (shortcut.id.startsWith('custom-')) {
							storeCustomShortcuts(customShortcuts.map((entry) => entry.id === shortcut.id ? { ...entry, code } : entry));
						} else {
							const nextBindings = { ...shortcutBindings, [shortcut.id]: code };
							localStorage.setItem(SHORTCUT_BINDINGS_KEY, JSON.stringify({ version: 1, bindings: nextBindings }));
							shortcutBindings = nextBindings;
						}
						renderShortcutList();
						announce(`${shortcut.label} shortcut saved on this device.`);
					} catch (error) {
						console.error('Rocky Games could not save shortcut settings:', error);
						announce(`Could not save shortcut: ${error.message}`);
					}
				});
				item.append(details, binding, button);
				if (shortcut.id.startsWith('custom-')) {
					const removeButton = document.createElement('button');
					removeButton.type = 'button';
					removeButton.className = 'news-shortcut-edit news-shortcut-delete';
					removeButton.textContent = 'Remove';
					removeButton.addEventListener('click', () => {
						try {
							storeCustomShortcuts(customShortcuts.filter((entry) => entry.id !== shortcut.id));
							renderShortcutList();
							announce(`${shortcut.label} shortcut removed.`);
						} catch (error) {
							console.error('Rocky Games could not remove a custom shortcut:', error);
							announce(`Could not remove shortcut: ${error.message}`);
						}
					});
					item.append(removeButton);
				}
				shortcutList.append(item);
			});
		}

		window.addEventListener('keydown', (event) => {
			if (!event.altKey || !event.shiftKey || event.ctrlKey || event.metaKey || event.repeat || event.isComposing) return;

			const activeElement = document.activeElement;
			if (activeElement instanceof HTMLElement && (
				activeElement.isContentEditable
				|| ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement.tagName)
			)) return;

			const shortcut = getShortcuts().find((item) => item.code === event.code);
			if (!shortcut) return;
			event.preventDefault();
			window.location.assign(new URL(shortcut.href, window.location.href).href);
		}, true);
		window.addEventListener('storage', (event) => {
			if (![SHORTCUT_BINDINGS_KEY, SHORTCUT_URLS_KEY, CUSTOM_SHORTCUTS_KEY].includes(event.key)) return;
			try {
				shortcutBindings = readShortcutBindings();
				shortcutUrls = readShortcutUrls();
				customShortcuts = readCustomShortcuts();
				renderShortcutList();
			} catch (error) {
				console.error('Rocky Games could not refresh saved shortcuts:', error);
				announce(`Could not refresh shortcuts: ${error.message}`);
			}
		});

		document.addEventListener('submit', (event) => {
			if (!(event.target instanceof HTMLFormElement) || !event.target.matches('.news-shortcut-add-form')) return;
			event.preventDefault();
			const addForm = event.target;
			const name = addForm.querySelector('[name="shortcutName"]').value.trim();
			const hrefInput = addForm.querySelector('[name="shortcutUrl"]');
			const letter = addForm.querySelector('[name="shortcutLetter"]').value.trim().toUpperCase();
			try {
				if (!name || name.length > 60) throw new Error('Enter a name of 1 to 60 characters.');
				const href = parseShortcutUrl(hrefInput.value.trim());
				if (!/^[A-Z]$/.test(letter)) throw new Error('Choose one letter from A to Z.');
				const code = `Key${letter}`;
				if (getShortcuts().some((shortcut) => shortcut.code === code)) throw new Error(`${letter} is already assigned. Choose another letter.`);
				const id = `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
				storeCustomShortcuts([...customShortcuts, { id, label: name, href, code }]);
				addForm.reset();
				renderShortcutList();
				announce(`${name} shortcut added and saved on this device.`);
			} catch (error) {
				console.error('Rocky Games could not add a custom shortcut:', error);
				announce(`Could not add shortcut: ${error.message}`);
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

	function initializeWhatsNew(shortcutList, renderShortcutList, showInitialNews) {
		const dialog = document.createElement('dialog');
		dialog.className = 'login-reminder news-reminder';
		dialog.setAttribute('aria-labelledby', 'news-reminder-title');
		dialog.innerHTML = `
			<p class="login-reminder-kicker">Rocky Games update</p>
			<h2 id="news-reminder-title">What's new</h2>
			<section class="news-intro">
				<ul class="news-update-list">
					<li><strong>Suggest a game!</strong> Have a game you want to add to Rocky Games? <a href="https://forms.gle/bnZNEvsSMgCAtDAZ8" target="_blank" rel="noopener">Fill out this form</a> or try the <a href="chance-games.html">Chance Arcade</a>.</li>
				</ul>
				<p>Use Option + Shift + a letter for a shortcut. Select “Edit shortcuts” to change shortcuts or add your own.</p>
				<div class="news-actions">
					<button class="login-reminder-button" type="button" data-news-action="show-shortcuts">Edit shortcuts</button>
					<button class="login-reminder-button news-secondary-button" type="button" data-news-action="close" autofocus>Great!</button>
				</div>
			</section>
			<section class="news-shortcuts" hidden aria-labelledby="news-shortcuts-title">
				<h3 id="news-shortcuts-title" tabindex="-1">Your shortcuts</h3>
				<p>Change any URL or key, or add your own shortcut. Shortcuts use Option + Shift + letter, and your settings are saved on this device.</p>
				<ul class="news-shortcut-list"></ul>
				<form class="news-shortcut-add-form">
					<h4>Add a shortcut</h4>
					<label>Name <input name="shortcutName" type="text" maxlength="60" required></label>
					<label>URL <input name="shortcutUrl" type="url" placeholder="https://example.com" required></label>
					<label>Key letter <input name="shortcutLetter" type="text" pattern="[A-Za-z]" maxlength="1" placeholder="B" required></label>
					<button class="login-reminder-button" type="submit">Add shortcut</button>
				</form>
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
		if (showInitialNews && !isNewsDismissed()) showWhatsNew();
		document.addEventListener('rocky-games-access-granted', () => {
			if (!isNewsDismissed()) showWhatsNew();
		}, { once: true });
	}

	function initializeAccessGate() {
		try {
			if (localStorage.getItem(ACCESS_GRANTED_KEY) === 'true') return true;
		} catch (error) {
			console.error('Rocky Games could not read access approval:', error);
		}

		const dialog = document.createElement('dialog');
		dialog.className = 'login-reminder rocky-access-gate';
		dialog.setAttribute('aria-labelledby', 'rocky-access-title');
		dialog.innerHTML = `
			<p class="login-reminder-kicker">Rocky Games</p>
			<h2 id="rocky-access-title">Enter access code</h2>
			<p>This site is for people with the access code.</p>
			<form>
				<label for="rocky-access-code">Access code</label>
				<input id="rocky-access-code" name="accessCode" type="password" autocomplete="off" required autofocus>
				<p class="rocky-access-error" role="alert" aria-live="polite"></p>
				<button class="login-reminder-button" type="submit">Continue</button>
			</form>
		`;
		document.body.append(dialog);

		const form = dialog.querySelector('form');
		const input = dialog.querySelector('#rocky-access-code');
		const errorMessage = dialog.querySelector('.rocky-access-error');
		form.addEventListener('submit', (event) => {
			event.preventDefault();
			if (input.value !== ACCESS_CODE) {
				errorMessage.textContent = 'That code is not correct. Try again.';
				input.select();
				return;
			}

			try {
				localStorage.setItem(ACCESS_GRANTED_KEY, 'true');
			} catch (error) {
				console.error('Rocky Games could not save access approval:', error);
				errorMessage.textContent = 'Access could not be saved in this browser. Enable local storage and try again.';
				return;
			}

			dialog.close();
			document.dispatchEvent(new Event('rocky-games-access-granted'));
		});
		input.addEventListener('input', () => {
			errorMessage.textContent = '';
		});
		dialog.addEventListener('cancel', (event) => {
			event.preventDefault();
		});
		if (typeof dialog.showModal === 'function') dialog.showModal();
		else dialog.setAttribute('open', '');
		return false;
	}

	function initialize() {
		const accessGranted = initializeAccessGate();
		initializeFullscreen();
		const toolbar = document.createElement('nav');
		toolbar.id = 'rocky-economy-toolbar';
		toolbar.setAttribute('aria-label', 'Rocky Games shortcuts and wallet');
		toolbar.innerHTML = '<span id="rocky-economy-balance" aria-live="polite"></span><a href="shop.html#daily-spin">Daily spin</a><a href="shop.html#background-shop">Background shop</a><a href="#whats-new" id="whats-new-help">What\'s new</a><span id="rocky-economy-status" role="status" aria-live="polite"></span>';
		document.body.append(toolbar);
		const shortcutList = document.createElement('ul');
		const renderShortcutList = initializeShortcuts(shortcutList);
		initializeWhatsNew(shortcutList, renderShortcutList, accessGranted);
		document.querySelector('#spin-button')?.addEventListener('click', spinWheel);
		document.querySelector('#wager-amount')?.addEventListener('input', renderWager);
		document.querySelector('#wager-form')?.addEventListener('submit', (event) => {
			event.preventDefault();
			const amountInput = document.querySelector('#wager-amount');
			wagerCoins(amountInput.valueAsNumber);
			renderWager();
		});

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

	window.RockyEconomy = { playChanceGame, rewardGameCompletion };
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
	else initialize();
})();
