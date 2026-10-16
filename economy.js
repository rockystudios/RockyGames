(() => {
	'use strict';

	const STORAGE_KEY = 'rockyGamesEconomy';
	const GAME_REWARD = 5;
	const prizes = [10, 15, 20, 25, 50, 100];
	const backgrounds = [
		{ id: 'default', name: 'Arcade Paper', price: 0, color: '#f3f1e8', image: 'radial-gradient(#20252218 0.7px, transparent 0.7px)', size: '8px 8px' },
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
		document.body.style.backgroundColor = background.color;
		document.body.style.backgroundImage = background.image;
		document.body.style.backgroundSize = background.size || 'cover';
		document.body.style.backgroundPosition = 'center';
		document.body.style.backgroundAttachment = background.size ? 'initial' : 'fixed';
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

	function initializeLoginShortcut() {
		window.addEventListener('keydown', (event) => {
			if (!event.altKey || !event.shiftKey || event.ctrlKey || event.metaKey || event.repeat || event.isComposing || event.code !== 'KeyA') return;

			const activeElement = document.activeElement;
			if (activeElement instanceof HTMLElement && (
				activeElement.isContentEditable
				|| ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement.tagName)
			)) return;

			event.preventDefault();
			window.location.assign('https://myaccess.apsva.us/idp/AuthnEngine#/authn');
		});
	}

	function initialize() {
		initializeFullscreen();
		initializeLoginShortcut();
		const toolbar = document.createElement('nav');
		toolbar.id = 'rocky-economy-toolbar';
		toolbar.setAttribute('aria-label', 'Rocky Games wallet');
		toolbar.innerHTML = '<span id="rocky-economy-balance" aria-live="polite"></span><a href="shop.html#daily-spin">Daily spin</a><a href="shop.html#background-shop">Background shop</a><span id="rocky-economy-status" role="status" aria-live="polite"></span>';
		document.body.append(toolbar);
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
