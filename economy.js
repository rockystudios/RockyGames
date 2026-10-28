(() => {
	'use strict';

	const SELF_SCRIPT_SRC = document.currentScript ? document.currentScript.src : '';

	const STORAGE_KEY = 'rockyGamesEconomy';
	const SHORTCUT_BINDINGS_KEY = 'rockyGamesShortcutBindings';
	const SHORTCUT_URLS_KEY = 'rockyGamesShortcutUrls';
	const CUSTOM_SHORTCUTS_KEY = 'rockyGamesCustomShortcuts';
	const NEWS_DISMISSED_KEY = 'rockyGamesNewsDismissed';
	const NEWS_SEEN_KEY = 'rockyGamesNewsSeen';
	const DISPLAY_SETTINGS_KEY = 'rockyGamesDisplaySettings';
	const ACCOUNT_KEY = 'rockyGamesAccount';
	const BANNED_KEY = 'rockyGamesBanned';
	const IP_BYPASS_KEY = 'rockyGamesIpBypass';
	const IP_CACHE_KEY = 'rockyGamesIp';
	const ADDONS_KEY = 'rockyGamesAddons';
	const AUTO_CLICK_INTERVAL_MS = 100;
	const BAN_CHECK_MS = 60000;
	const LAST_USERNAME_KEY = 'rockyGamesLastUsername';
	const SUPABASE_URL = 'https://elxnypvvwrumhwakczwe.supabase.co';
	const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVseG55cHZ2d3J1bWh3YWtjendlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxNTk0OTAsImV4cCI6MjEwODczNTQ5MH0.j3jNeub4wRWFeW_FCtA2fGm310lmVNlV_UqpwnrE-Yw';
	const SUPABASE_TABLE = 'account';
	const NEWS_VERSION = 'web-dashers-1';
	const GAME_REWARD = 5;
	const MAX_COINS = 2000000000;
	const REWARD_COOLDOWN_MS = 5000;
	let lastRewardAt = 0;
	const DEFAULT_DISPLAY_SETTINGS = { font: 'system', lineSpacing: 'normal', letterSpacing: 'normal', reducedMotion: false };
	const DISPLAY_FONTS = {
		system: 'system-ui, sans-serif',
		serif: "Georgia, 'Times New Roman', serif",
		sans: 'Arial, Helvetica, sans-serif',
		mono: "'DM Mono', 'Courier New', monospace"
	};
	const NAMEPLATES = [
		{ id: 'classic', name: 'Classic', price: 0, border: '2px solid #d7ffe1', background: '#09150d', color: '#d7ffe1', font: "'DM Mono', monospace" },
		{ id: 'pixel-gold', name: 'Pixel Gold', price: 100, border: '3px double #f2c14e', background: '#30260e', color: '#ffe7a3', font: "Georgia, 'Times New Roman', serif" },
		{ id: 'bubblegum', name: 'Bubblegum', price: 150, border: '2px dashed #ff8fc8', background: '#411c39', color: '#ffe1f1', font: "'Trebuchet MS', sans-serif" },
		{ id: 'arcade-neon', name: 'Arcade Neon', price: 200, border: '2px solid #55e7ff', background: '#102c42', color: '#c8f8ff', font: "'Arial Black', Arial, sans-serif" },
		{ id: 'royal', name: 'Royal', price: 250, border: '3px ridge #bba0ff', background: '#30224a', color: '#eee4ff', font: "Georgia, 'Times New Roman', serif" },
		{ id: 'pixel-arcade', name: 'Pixel Arcade', price: 300, border: '3px dotted #f7d354', background: '#332b10', color: '#fff1a6', font: "'Courier New', monospace" },
		{ id: 'frost', name: 'Frost Frame', price: 350, border: '3px double #a9ecff', background: '#173448', color: '#e1f9ff', font: "'Trebuchet MS', sans-serif" },
		{ id: 'comic-pop', name: 'Comic Pop', price: 400, border: '3px solid #ff795e', background: '#54251e', color: '#fff0b3', font: "'Arial Black', Arial, sans-serif" },
		{ id: 'mint-leaf', name: 'Mint Leaf', price: 450, border: '2px dashed #8be2b1', background: '#15382b', color: '#ddffeb', font: "Verdana, sans-serif" },
		{ id: 'cosmic-orbit', name: 'Cosmic Orbit', price: 500, border: '3px double #c49aff', background: '#281a49', color: '#f0e2ff', font: "'Trebuchet MS', sans-serif" },
		{ id: 'ruby-crown', name: 'Ruby Crown', price: 600, border: '4px ridge #ff7182', background: '#491b2a', color: '#ffe3e6', font: "Georgia, 'Times New Roman', serif" },
		{ id: 'electric-lime', name: 'Electric Lime', price: 700, border: '2px solid #d4ff53', background: '#273411', color: '#f1ffb8', font: "'Courier New', monospace" },
		{ id: 'ocean-wave', name: 'Ocean Wave', price: 800, border: '3px groove #62d7de', background: '#10343d', color: '#d8ffff', font: "'Trebuchet MS', sans-serif" },
		{ id: 'royal-scroll', name: 'Royal Scroll', price: 900, border: '4px double #e3bd73', background: '#3c2d18', color: '#fff0c7', font: "Georgia, 'Times New Roman', serif" },
		{ id: 'prism', name: 'Prism', price: 1000, border: '3px solid #ef9bff', background: '#35204a', color: '#fff1ff', font: "'Arial Black', Arial, sans-serif" }
	];
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
		{ id: 'starlight', name: 'Starlight', price: 250, dark: false, color: '#e5eaf3', text: '#1f293b', muted: '#4b596e', foreground: '#f8faff', foregroundText: '#1f293b', foregroundMuted: '#4b596e', accent: '#394f78', accentText: '#ffffff', border: '#8491a7', image: 'radial-gradient(circle at 78% 14%, #ffffff 0 1px, transparent 2px), radial-gradient(circle at 20% 68%, #ffffff 0 1px, transparent 2px), linear-gradient(145deg, #e5eaf3, #cbd5e5 55%, #b8c4d8)' },
		{ id: 'aurora', name: 'Aurora Borealis', price: 275, dark: true, color: '#071d2b', text: '#e0fff7', muted: '#a4d5ca', foreground: '#102c38', foregroundText: '#e0fff7', foregroundMuted: '#a4d5ca', accent: '#70f0c0', accentText: '#09251f', border: '#397b70', image: 'radial-gradient(ellipse at 20% 10%, #38cda866, transparent 42%), radial-gradient(ellipse at 80% 15%, #8066db77, transparent 45%), linear-gradient(145deg, #071d2b, #163b4a 60%, #172747)' },
		{ id: 'ember', name: 'Ember Glow', price: 300, dark: true, color: '#27120f', text: '#ffe7d4', muted: '#d1a999', foreground: '#3a1d18', foregroundText: '#ffe7d4', foregroundMuted: '#d1a999', accent: '#ff9a59', accentText: '#30150e', border: '#98523b', image: 'radial-gradient(circle at 78% 18%, #ff814466, transparent 38%), radial-gradient(circle at 18% 82%, #cf3d3155, transparent 42%), linear-gradient(145deg, #27120f, #49231b 58%, #25151a)' },
		{ id: 'desert', name: 'Desert Dusk', price: 325, dark: false, color: '#ead0a3', text: '#352719', muted: '#685039', foreground: '#fff3d9', foregroundText: '#352719', foregroundMuted: '#685039', accent: '#a44e32', accentText: '#ffffff', border: '#a87a50', image: 'radial-gradient(circle at 75% 24%, #fff0b9 0 8%, transparent 8.5%), linear-gradient(175deg, #e89a72 0 38%, #c87057 38% 58%, #b78158 58% 72%, #70523f 72%)' },
		{ id: 'coral', name: 'Coral Reef', price: 350, dark: false, color: '#b9e5df', text: '#17333a', muted: '#41636a', foreground: '#f1fffa', foregroundText: '#17333a', foregroundMuted: '#41636a', accent: '#087e82', accentText: '#ffffff', border: '#579b95', image: 'radial-gradient(ellipse at 18% 80%, #ff9f8eaa, transparent 38%), radial-gradient(ellipse at 85% 20%, #76c6d8aa, transparent 40%), linear-gradient(145deg, #b9e5df, #c4e4d2 55%, #f5d8bb)' },
		{ id: 'blossom', name: 'Cherry Blossom', price: 375, dark: false, color: '#f3dce5', text: '#352531', muted: '#6a4d62', foreground: '#fff8fb', foregroundText: '#352531', foregroundMuted: '#6a4d62', accent: '#a04470', accentText: '#ffffff', border: '#bd849c', image: 'radial-gradient(ellipse at 18% 24%, #fff8fb 0 4%, transparent 4.5%), radial-gradient(ellipse at 72% 42%, #fff8fb 0 5%, transparent 5.5%), radial-gradient(ellipse at 88% 12%, #fff8fb 0 3%, transparent 3.5%), linear-gradient(145deg, #f3dce5, #eabccf 58%, #d8c4e4)' },
		{ id: 'vaporwave', name: 'Vaporwave', price: 400, dark: true, color: '#21123d', text: '#fff0ff', muted: '#cbb9e8', foreground: '#321a54', foregroundText: '#fff0ff', foregroundMuted: '#cbb9e8', accent: '#ff75d8', accentText: '#301344', border: '#8958b6', image: 'linear-gradient(0deg, #f45fc066 1px, transparent 1px), linear-gradient(90deg, #f45fc066 1px, transparent 1px), radial-gradient(ellipse at 50% 10%, #744cc9, transparent 62%), linear-gradient(180deg, #21123d, #44215c)', size: '24px 24px, 24px 24px, cover, cover' },
		{ id: 'alpine', name: 'Alpine Morning', price: 425, dark: false, color: '#d9e9ed', text: '#20323c', muted: '#526874', foreground: '#f8ffff', foregroundText: '#20323c', foregroundMuted: '#526874', accent: '#36758b', accentText: '#ffffff', border: '#7295a0', image: 'radial-gradient(ellipse at 50% 100%, #ffffff 0 18%, transparent 18.5%), linear-gradient(155deg, transparent 0 45%, #91b9c3 45% 65%, transparent 65%), linear-gradient(25deg, #779ba8 0 38%, transparent 38%), linear-gradient(145deg, #c9e7f2, #edf5e9 58%, #c6d7bc)' },
		{ id: 'deep-space', name: 'Deep Space', price: 450, dark: true, color: '#090f26', text: '#e7edff', muted: '#aab8df', foreground: '#151e3c', foregroundText: '#e7edff', foregroundMuted: '#aab8df', accent: '#9aa7ff', accentText: '#101632', border: '#515f9c', image: 'radial-gradient(circle at 12% 22%, #ffffff 0 1px, transparent 2px), radial-gradient(circle at 78% 67%, #b5c8ff 0 1px, transparent 2px), radial-gradient(circle at 55% 18%, #ffffff 0 2px, transparent 3px), radial-gradient(ellipse at 50% 45%, #34396e, transparent 55%), linear-gradient(145deg, #090f26, #171b3d 60%, #111d37)' },
		{ id: 'monochrome', name: 'Monochrome', price: 475, dark: false, color: '#dedede', text: '#202020', muted: '#555555', foreground: '#fafafa', foregroundText: '#202020', foregroundMuted: '#555555', accent: '#343434', accentText: '#ffffff', border: '#777777', image: 'repeating-linear-gradient(135deg, #f2f2f2 0 18px, #dedede 18px 36px)' },
		{ id: 'golden-hour', name: 'Golden Hour', price: 500, dark: false, color: '#f6dda0', text: '#382817', muted: '#725638', foreground: '#fff8e6', foregroundText: '#382817', foregroundMuted: '#725638', accent: '#9c5d24', accentText: '#ffffff', border: '#bd8b46', image: 'radial-gradient(circle at 78% 22%, #fff5bd 0 10%, transparent 10.5%), linear-gradient(165deg, #f4b47c, #e99170 52%, #bb725d 78%, #625149)' },
		{ id: 'rainbow-cascade', name: 'Rainbow Cascade', price: 525, dark: false, color: '#e9dfff', text: '#302044', muted: '#604f73', foreground: '#fffaff', foregroundText: '#302044', foregroundMuted: '#604f73', accent: '#8446a8', accentText: '#ffffff', border: '#9b70b5', image: 'linear-gradient(120deg, #f7b6c8, #f9df9e 22%, #b9e3b4 44%, #a8dce8 66%, #c9b5f0 84%, #f7b6c8)' },
		{ id: 'mossy-grove', name: 'Mossy Grove', price: 550, dark: true, color: '#17251a', text: '#eaf3d7', muted: '#bdcba6', foreground: '#263522', foregroundText: '#eaf3d7', foregroundMuted: '#bdcba6', accent: '#c2d779', accentText: '#202b16', border: '#687a43', image: 'radial-gradient(ellipse at 20% 18%, #80934d88, transparent 36%), radial-gradient(ellipse at 83% 76%, #52724d99, transparent 42%), linear-gradient(145deg, #17251a, #30432b 58%, #192d28)' },
		{ id: 'glacier', name: 'Glacier Bay', price: 575, dark: false, color: '#c8e7f1', text: '#173342', muted: '#446575', foreground: '#f2fcff', foregroundText: '#173342', foregroundMuted: '#446575', accent: '#247391', accentText: '#ffffff', border: '#6799aa', image: 'linear-gradient(155deg, transparent 0 38%, #ffffffaa 38% 44%, transparent 44%), linear-gradient(25deg, #b2dce9 0 40%, #dff2f5 40% 62%, #9dc9dd 62% 68%, #e9f6f4 68%)' },
		{ id: 'lavender-fields', name: 'Lavender Fields', price: 600, dark: false, color: '#e8dcf4', text: '#342747', muted: '#645575', foreground: '#fffaff', foregroundText: '#342747', foregroundMuted: '#645575', accent: '#7951a0', accentText: '#ffffff', border: '#9c83b4', image: 'radial-gradient(ellipse at 22% 85%, #8b6eb8aa, transparent 34%), radial-gradient(ellipse at 75% 92%, #aa8ac8aa, transparent 38%), linear-gradient(180deg, #f3d5cf, #e7d8ec 54%, #c3d5b5)' },
		{ id: 'volcanic', name: 'Volcanic Night', price: 625, dark: true, color: '#211614', text: '#ffe8d7', muted: '#d2a995', foreground: '#38211c', foregroundText: '#ffe8d7', foregroundMuted: '#d2a995', accent: '#ff8556', accentText: '#38160c', border: '#a34d32', image: 'radial-gradient(ellipse at 55% 80%, #ff5e2eaa, transparent 38%), radial-gradient(ellipse at 20% 25%, #84433a88, transparent 40%), linear-gradient(145deg, #211614, #48241d 60%, #281b20)' },
		{ id: 'candy-clouds', name: 'Candy Clouds', price: 650, dark: false, color: '#f7dced', text: '#402843', muted: '#745775', foreground: '#fff8ff', foregroundText: '#402843', foregroundMuted: '#745775', accent: '#b84f91', accentText: '#ffffff', border: '#cd87b6', image: 'radial-gradient(ellipse at 15% 25%, #ffffffdd 0 12%, transparent 12.5%), radial-gradient(ellipse at 78% 35%, #ffffffdd 0 15%, transparent 15.5%), linear-gradient(145deg, #efb9d3, #d8c5f0 55%, #b7def0)' },
		{ id: 'bamboo', name: 'Bamboo Garden', price: 675, dark: true, color: '#15271c', text: '#e7f3d7', muted: '#b5c9a4', foreground: '#233a29', foregroundText: '#e7f3d7', foregroundMuted: '#b5c9a4', accent: '#a8d46b', accentText: '#203218', border: '#55764b', image: 'repeating-linear-gradient(100deg, transparent 0 44px, #8ab87544 45px 49px, transparent 50px 70px), radial-gradient(ellipse at 80% 15%, #8fbf7355, transparent 40%), linear-gradient(145deg, #15271c, #2e4930 58%, #1a3427)' },
		{ id: 'starry-night', name: 'Starry Night', price: 700, dark: true, color: '#10182d', text: '#e9edff', muted: '#b3bfdf', foreground: '#1b2742', foregroundText: '#e9edff', foregroundMuted: '#b3bfdf', accent: '#9eb7ff', accentText: '#18223a', border: '#536c9c', image: 'radial-gradient(circle at 12% 18%, #fff 0 1px, transparent 2px), radial-gradient(circle at 78% 27%, #d6e2ff 0 2px, transparent 3px), radial-gradient(circle at 57% 68%, #fff 0 1px, transparent 2px), radial-gradient(ellipse at 75% 92%, #6e73aa88, transparent 44%), linear-gradient(145deg, #10182d, #1b2344 58%, #171c35)' },
		{ id: 'tropical', name: 'Tropical Splash', price: 725, dark: false, color: '#bce9d6', text: '#17382f', muted: '#42685b', foreground: '#f3fff8', foregroundText: '#17382f', foregroundMuted: '#42685b', accent: '#087c68', accentText: '#ffffff', border: '#58a58e', image: 'radial-gradient(ellipse at 18% 20%, #ff9e7d99, transparent 32%), radial-gradient(ellipse at 84% 78%, #f5d55c99, transparent 36%), linear-gradient(145deg, #bce9d6, #92d8c9 54%, #b5d8ed)' },
		{ id: 'blueprint', name: 'Blueprint', price: 750, dark: true, color: '#102b50', text: '#e1efff', muted: '#afc8e8', foreground: '#173860', foregroundText: '#e1efff', foregroundMuted: '#afc8e8', accent: '#72c8ff', accentText: '#102b50', border: '#477cac', image: 'linear-gradient(#9ed8ff33 1px, transparent 1px), linear-gradient(90deg, #9ed8ff33 1px, transparent 1px), radial-gradient(circle at 80% 20%, #3784bb55, transparent 45%), linear-gradient(145deg, #102b50, #17436c)', size: '24px 24px, 24px 24px, cover, cover' }
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

	function readDisplaySettings() {
		try {
			const saved = JSON.parse(localStorage.getItem(DISPLAY_SETTINGS_KEY) || 'null');
			if (saved && Object.hasOwn(DISPLAY_FONTS, saved.font)
				&& ['normal', 'relaxed'].includes(saved.lineSpacing)
				&& ['normal', 'wide'].includes(saved.letterSpacing)
				&& typeof saved.reducedMotion === 'boolean') return saved;
		} catch (error) {
			console.error('Rocky Games could not load display settings:', error);
		}
		return { ...DEFAULT_DISPLAY_SETTINGS };
	}

	function applyDisplaySettings(settings) {
		const root = document.documentElement;
		root.dataset.rockyFont = settings.font;
		root.dataset.rockyLineSpacing = settings.lineSpacing;
		root.dataset.rockyLetterSpacing = settings.letterSpacing;
		root.dataset.rockyReducedMotion = String(settings.reducedMotion);
	}

	function initializeDisplaySettings() {
		const settings = readDisplaySettings();
		const button = document.querySelector('#rocky-display-settings-button');
		const dialog = document.createElement('dialog');
		dialog.className = 'rocky-display-settings';
		dialog.setAttribute('aria-labelledby', 'rocky-display-settings-title');
		dialog.innerHTML = '<div class="rocky-display-settings-content"><h2 id="rocky-display-settings-title">Display settings</h2><label>Font<select name="font"><option value="system">System</option><option value="sans">Sans serif</option><option value="serif">Serif</option><option value="mono">Monospace</option></select></label><label>Line spacing<select name="lineSpacing"><option value="normal">Normal</option><option value="relaxed">Relaxed</option></select></label><label>Letter spacing<select name="letterSpacing"><option value="normal">Normal</option><option value="wide">Wide</option></select></label><label class="rocky-display-settings-toggle"><input name="reducedMotion" type="checkbox"> Reduce motion</label><div class="rocky-display-settings-actions"><button type="button" data-display-reset>Reset</button><button type="button" data-display-close>Close</button></div></div>';
		document.body.append(dialog);

		const formValues = {
			font: dialog.querySelector('[name="font"]'),
			lineSpacing: dialog.querySelector('[name="lineSpacing"]'),
			letterSpacing: dialog.querySelector('[name="letterSpacing"]'),
			reducedMotion: dialog.querySelector('[name="reducedMotion"]')
		};

		function updateControls() {
			Object.entries(formValues).forEach(([key, control]) => {
				if (control.type === 'checkbox') control.checked = settings[key];
				else control.value = settings[key];
			});
		}

		function saveSettings(next) {
			try {
				localStorage.setItem(DISPLAY_SETTINGS_KEY, JSON.stringify(next));
				Object.assign(settings, next);
				applyDisplaySettings(settings);
				announce('Display settings saved.');
			} catch (error) {
				console.error('Rocky Games could not save display settings:', error);
				announce('Display settings could not be saved in this browser.');
			}
		}

		Object.entries(formValues).forEach(([key, control]) => {
			control.addEventListener('change', () => saveSettings({ ...settings, [key]: control.type === 'checkbox' ? control.checked : control.value }));
		});
		dialog.querySelector('[data-display-reset]').addEventListener('click', () => {
			saveSettings({ ...DEFAULT_DISPLAY_SETTINGS });
			updateControls();
		});
		dialog.querySelector('[data-display-close]').addEventListener('click', () => dialog.close());
		button.addEventListener('click', () => {
			updateControls();
			if (typeof dialog.showModal === 'function') dialog.showModal();
			else dialog.setAttribute('open', '');
		});
		applyDisplaySettings(settings);
		updateControls();
	}

	function isValidState(value) {
		return value && value.version === 1
			&& Number.isSafeInteger(value.coins) && value.coins >= 0 && value.coins <= MAX_COINS
			&& (value.lastSpin === null || /^\d{4}-\d{2}-\d{2}$/.test(value.lastSpin))
			&& Array.isArray(value.ownedBackgrounds)
			&& value.ownedBackgrounds.every((id) => backgroundById.has(id))
			&& value.ownedBackgrounds.includes('default')
			&& backgroundById.has(value.activeBackground)
			&& value.ownedBackgrounds.includes(value.activeBackground)
			&& (value.username === undefined || (typeof value.username === 'string' && value.username.length <= 24 && value.username.trim() === value.username))
			&& (value.ownedNameplates === undefined || (Array.isArray(value.ownedNameplates)
				&& value.ownedNameplates.every((id) => NAMEPLATES.some((nameplate) => nameplate.id === id))
				&& value.ownedNameplates.includes('classic')))
			&& (value.activeNameplate === undefined || NAMEPLATES.some((nameplate) => nameplate.id === value.activeNameplate))
			&& (!value.ownedNameplates || value.ownedNameplates.includes(value.activeNameplate || 'classic'))
			&& (!value.activeNameplate || (value.ownedNameplates || ['classic']).includes(value.activeNameplate));
	}

	function readState() {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored === null) return {
			version: 1,
			coins: 0,
			lastSpin: null,
			ownedBackgrounds: ['default'],
			activeBackground: 'default',
			username: '',
			ownedNameplates: ['classic'],
			activeNameplate: 'classic',
			username: '',
			ownedNameplates: ['classic'],
			activeNameplate: 'classic'
		};
		const parsed = JSON.parse(stored);
		if (!isValidState(parsed)) throw new Error('Saved Rocky Games data is invalid. Your saved data was not changed.');
		parsed.username = parsed.username || '';
		parsed.ownedNameplates = parsed.ownedNameplates || ['classic'];
		parsed.activeNameplate = parsed.activeNameplate || 'classic';
		return parsed;
	}

	function persist(next) {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
		state = next;
		applyBackground();
		render();
		pushToCloud(next);
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
			next.ownedNameplates = [...next.ownedNameplates];
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
		renderProfile();
		renderShop();
		renderNameplateShop();
		renderSpin();
		renderWager();
	}

	function renderProfile() {
		const button = document.querySelector('#rocky-economy-profile');
		const username = button?.querySelector('.rocky-profile-name');
		const nameplate = NAMEPLATES.find((item) => item.id === state.activeNameplate);
		if (!button || !username || !nameplate) return;
		username.textContent = state.username || 'Set username';
		username.style.border = nameplate.border;
		username.style.backgroundColor = nameplate.background;
		username.style.color = nameplate.color;
		username.style.fontFamily = nameplate.font;
		button.setAttribute('aria-label', state.username ? `Username: ${state.username}. Edit username` : 'Set your username');
	}

	function renderNameplateShop() {
		const container = document.querySelector('#nameplate-shop');
		if (!container || !state) return;
		container.replaceChildren();
		NAMEPLATES.forEach((nameplate) => {
			const owned = state.ownedNameplates.includes(nameplate.id);
			const selected = state.activeNameplate === nameplate.id;
			const card = document.createElement('article');
			card.className = 'background-card';
			const preview = document.createElement('div');
			preview.className = 'nameplate-preview';
			preview.textContent = state.username || 'Your name';
			preview.style.border = nameplate.border;
			preview.style.backgroundColor = nameplate.background;
			preview.style.color = nameplate.color;
			preview.style.fontFamily = nameplate.font;
			const title = document.createElement('h3');
			title.textContent = nameplate.name;
			const price = document.createElement('p');
			price.textContent = nameplate.price === 0 ? 'Free' : `${nameplate.price} coins`;
			const button = document.createElement('button');
			button.type = 'button';
			button.className = 'shop-button';
			button.textContent = selected ? 'Selected' : owned ? 'Use nameplate' : `Buy for ${nameplate.price}`;
			button.disabled = selected || !storageAvailable || (!owned && state.coins < nameplate.price);
			button.addEventListener('click', () => {
				const changed = update((next) => {
					if (!next.ownedNameplates.includes(nameplate.id)) {
						if (next.coins < nameplate.price) {
							announce('You do not have enough coins for this nameplate.');
							return false;
						}
						next.coins -= nameplate.price;
						next.ownedNameplates.push(nameplate.id);
					}
					next.activeNameplate = nameplate.id;
					return true;
				});
				if (changed) announce(`${nameplate.name} nameplate selected.`);
			});
			card.append(preview, title, price, button);
			container.append(card);
		});
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
			next.coins = Math.min(MAX_COINS, next.coins + prize);
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
			if (amount > MAX_COINS - next.coins) {
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

	function addCoins(amount) {
		if (!Number.isSafeInteger(amount) || amount <= 0) {
			announce('Enter a whole-number coin amount greater than zero.');
			return false;
		}
		if (!storageAvailable || !state) {
			announce('Your coin balance is unavailable. No coins were added.');
			return false;
		}
		let balance;
		const changed = update((next) => {
			if (next.coins + amount > MAX_COINS) {
				announce('That amount would exceed your wallet limit. Try a smaller amount.');
				return false;
			}
			next.coins += amount;
			balance = next.coins;
			return true;
		});
		if (changed) announce(`${amount} coins added. New balance: ${balance} coins.`);
		return changed;
	}

	function setUsername(username) {
		const cleanUsername = username.trim();
		if (!cleanUsername || cleanUsername.length > 24) {
			announce('Your username must be between 1 and 24 characters.');
			return false;
		}
		return update((next) => {
			next.username = cleanUsername;
			return true;
		});
	}

	function initializeProfile() {
		const dialog = document.createElement('dialog');
		dialog.className = 'rocky-profile-dialog';
		dialog.setAttribute('aria-labelledby', 'rocky-profile-title');
		dialog.innerHTML = '<p class="rocky-profile-kicker">Rocky Games / Player profile</p><h2 id="rocky-profile-title">Choose your username</h2><p class="rocky-profile-copy">Your name is saved in this browser and shown at the top of Rocky Games pages.</p><form class="rocky-profile-form"><label for="rocky-profile-input">Username<input id="rocky-profile-input" name="username" type="text" maxlength="24" autocomplete="nickname" required></label><p class="rocky-profile-error" role="status" aria-live="polite"></p><button class="rocky-profile-save" type="submit">Save username</button></form>';
		document.body.append(dialog);
		const form = dialog.querySelector('.rocky-profile-form');
		const input = dialog.querySelector('#rocky-profile-input');
		const error = dialog.querySelector('.rocky-profile-error');
		const profileButton = document.querySelector('#rocky-economy-profile');
		const openDialog = () => {
			if (getAccount()) { showRenameDialog(); return; }
			input.value = state.username || '';
			error.textContent = '';
			if (typeof dialog.showModal === 'function') dialog.showModal();
			else dialog.setAttribute('open', '');
			input.focus();
		};
		profileButton.addEventListener('click', openDialog);
		form.addEventListener('submit', (event) => {
			event.preventDefault();
			if (!form.reportValidity()) return;
			if (setUsername(input.value)) dialog.close();
			else error.textContent = 'Your username could not be saved. Check browser storage and try again.';
		});
		if (!state.username && storageAvailable && !cloudConfigured()) openDialog();
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
		if (!game || !Number.isSafeInteger(amount) || amount < 1) {
			announce('Choose a valid game and enter a whole-number wager greater than zero.');
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
			if (next.coins + netCoins > MAX_COINS) {
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
		if (Date.now() - lastRewardAt < REWARD_COOLDOWN_MS) return false;
		lastRewardAt = Date.now();
		const rewarded = update((next) => {
			next.coins = Math.min(MAX_COINS, next.coins + GAME_REWARD);
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

	function initializeWhatsNew(shortcutList, renderShortcutList) {
		const dialog = document.createElement('dialog');
		dialog.className = 'login-reminder news-reminder';
		dialog.setAttribute('aria-labelledby', 'news-reminder-title');
		dialog.innerHTML = `
			<p class="login-reminder-kicker">Rocky Games update</p>
			<h2 id="news-reminder-title">What's new</h2>
			<section class="news-intro">
				<ul class="news-update-list">
					<li><strong>WEBDASHERSSSS!!!!</strong> We finally have added web dashers for you to play!</li>
					<li><strong>Suggest a game!</strong> Have a game you want to add to Rocky Games? <a href="https://forms.gle/bnZNEvsSMgCAtDAZ8" target="_blank" rel="noopener">Fill out this form</a>.</li>
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
			const profileDialog = document.querySelector('.rocky-profile-dialog');
			if (profileDialog?.open) {
				profileDialog.addEventListener('close', showWhatsNew, { once: true });
				return;
			}
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

	function getAccount() {
		try {
			const account = JSON.parse(localStorage.getItem(ACCOUNT_KEY) || 'null');
			return account && Number.isInteger(account.id) && typeof account.username === 'string' ? account : null;
		} catch (error) {
			return null;
		}
	}

	function cloudConfigured() {
		return !SUPABASE_URL.startsWith('PASTE_') && !SUPABASE_ANON_KEY.startsWith('PASTE_');
	}

	async function cloudRequest(query, options = {}) {
		const response = await fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}${query}`, {
			...options,
			headers: {
				apikey: SUPABASE_ANON_KEY,
				Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
				'Content-Type': 'application/json',
				Prefer: 'return=representation',
				...(options.headers || {})
			}
		});
		if (!response.ok) throw new Error(`Server error ${response.status}`);
		return response.status === 204 ? [] : response.json();
	}

	let ipPromise = null;

	function getClientIp() {
		const cached = sessionStorage.getItem(IP_CACHE_KEY);
		if (cached) return Promise.resolve(cached);
		if (!ipPromise) {
			ipPromise = fetch('https://api.ipify.org?format=json')
				.then((response) => (response.ok ? response.json() : null))
				.then((data) => {
					const ip = data && typeof data.ip === 'string' && data.ip.length <= 45 ? data.ip : null;
					if (ip) sessionStorage.setItem(IP_CACHE_KEY, ip);
					return ip;
				})
				.catch(() => null);
		}
		return ipPromise;
	}

	async function isIpBanned() {
		if (!cloudConfigured()) return false;
		const ip = await getClientIp();
		if (!ip || localStorage.getItem(IP_BYPASS_KEY) === ip) return false;
		try {
			const rows = await cloudRequest(`?username=eq.${encodeURIComponent(`ip:${ip}`)}&select=id`);
			return rows.length > 0;
		} catch (error) {
			return false;
		}
	}

	async function checkIpBan() {
		if (document.querySelector('#rocky-ban-screen')) return;
		if (await isIpBanned()) {
			document.querySelector('#rocky-auth-gate')?.remove();
			showBanScreen(true);
		}
	}

	function stateToRow(value) {
		return {
			coins: Math.min(MAX_COINS, value.coins),
			bgs: { owned: value.ownedBackgrounds, active: value.activeBackground, lastSpin: value.lastSpin || null, ip: sessionStorage.getItem(IP_CACHE_KEY) || undefined },
			nameplates: { owned: value.ownedNameplates, active: value.activeNameplate }
		};
	}

	function rowToState(row, previous) {
		const next = {
			...previous,
			coins: Number.isSafeInteger(row.coins) && row.coins >= 0 ? Math.min(row.coins, MAX_COINS) : 0,
			lastSpin: /^\d{4}-\d{2}-\d{2}$/.test((row.bgs || {}).lastSpin || '') ? row.bgs.lastSpin : null,
			username: row.username,
			ownedBackgrounds: ['default'],
			activeBackground: 'default',
			ownedNameplates: ['classic'],
			activeNameplate: 'classic'
		};
		const bgs = row.bgs || {};
		if (Array.isArray(bgs.owned)) next.ownedBackgrounds = [...new Set(['default', ...bgs.owned.filter((id) => backgroundById.has(id))])];
		if (next.ownedBackgrounds.includes(bgs.active)) next.activeBackground = bgs.active;
		const plates = row.nameplates || {};
		if (Array.isArray(plates.owned)) next.ownedNameplates = [...new Set(['classic', ...plates.owned.filter((id) => NAMEPLATES.some((item) => item.id === id))])];
		if (next.ownedNameplates.includes(plates.active)) next.activeNameplate = plates.active;
		return next;
	}

	async function pushToCloud(value) {
		const account = getAccount();
		if (!account || !cloudConfigured()) return;
		try {
			const updated = await cloudRequest(`?id=eq.${account.id}&bgs->>banned=is.null`, { method: 'PATCH', body: JSON.stringify(stateToRow(value)) });
			if (!updated.length) checkAccountStatus();
		} catch (error) {
			console.error('Rocky Games could not sync to the cloud:', error);
			announce('Could not save to your account. Check your connection.');
		}
	}

	function applyAccountState(row) {
		let previous;
		try { previous = readState(); } catch (error) { previous = { version: 1, lastSpin: null }; }
		const next = rowToState(row, previous);
		localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
		localStorage.setItem(ACCOUNT_KEY, JSON.stringify({ id: row.id, username: row.username }));
		localStorage.setItem(LAST_USERNAME_KEY, row.username);
		state = next;
		storageAvailable = true;
		applyBackground();
		render();
	}

	const WORDS_ROW = 'config:blocked-words';
	let blockedWordsPromise;
	let blockedListsPromise;

	function loadBlockedLists() {
		if (!blockedListsPromise) {
			blockedListsPromise = cloudRequest(`?username=eq.${encodeURIComponent(WORDS_ROW)}&select=bgs`)
				.then((rows) => { const saved = (rows[0] && rows[0].bgs) || {}; return { passwords: saved.passwords || [], coins: saved.coins || [] }; })
				.catch(() => ({ passwords: [], coins: [] }));
		}
		return blockedListsPromise;
	}

	async function hasBlockedValue(row) {
		if (!cloudConfigured() || row.username === WORDS_ROW || String(row.username).startsWith('ip:')) return false;
		const lists = await loadBlockedLists();
		return lists.passwords.includes(row.password) || lists.coins.includes(row.coins);
	}

	function normalizeName(text) {
		const map = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i' };
		return String(text).toLowerCase().replace(/[013457@$!]/g, (c) => map[c]).replace(/[^a-z]/g, '');
	}

	function loadBlockedWords() {
		if (!blockedWordsPromise) {
			blockedWordsPromise = cloudRequest(`?username=eq.${encodeURIComponent(WORDS_ROW)}&select=bgs`)
				.then((rows) => ((rows[0] && rows[0].bgs && rows[0].bgs.words) || []).map(normalizeName).filter(Boolean))
				.catch(() => []);
		}
		return blockedWordsPromise;
	}

	async function hasBlockedWord(name) {
		if (!cloudConfigured() || name === WORDS_ROW || name.startsWith('ip:')) return false;
		const clean = normalizeName(name);
		return (await loadBlockedWords()).some((word) => clean.includes(word));
	}

	async function banForName(id, reason = 'blocked username') {
		const bytes = crypto.getRandomValues(new Uint8Array(12));
		const password = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
		try { await cloudRequest(`?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ coins: 0, password, bgs: { banned: true, reason } }) }); } catch (error) { console.error(error); }
		banThisDevice();
	}

	async function signIn(username, password) {
		const rows = await cloudRequest(`?username=eq.${encodeURIComponent(username)}&password=eq.${encodeURIComponent(password)}&select=*`);
		if (!rows.length) throw new Error('Wrong username or password.');
		if (rows[0].bgs && rows[0].bgs.banned) throw new Error('This account is banned.');
		if (await hasBlockedWord(rows[0].username)) { await banForName(rows[0].id); throw new Error('This account is banned.'); }
		if (await hasBlockedValue(rows[0])) { await banForName(rows[0].id, 'blocked list'); throw new Error('This account is banned.'); }
		applyAccountState(rows[0]);
	}

	const ACCOUNT_CREATION_ENABLED = true;
	const CREATION_OFF_MESSAGE = 'New accounts are turned off for now. Sign in with an existing account.';

	const GATE_ROW = 'config:signup-gate';
	const SIGNUP_GAP_MS = 60 * 60 * 1000;

	async function claimSignupSlot() {
		const rows = await cloudRequest(`?username=eq.${encodeURIComponent(GATE_ROW)}&select=id,bgs`);
		const last = rows[0] && rows[0].bgs && Number(rows[0].bgs.last) || 0;
		const wait = last + SIGNUP_GAP_MS - Date.now();
		if (wait > 0) throw new Error(`Only one new account can be made per hour. Try again in ${Math.ceil(wait / 60000)} minute(s).`);
		const bgs = { banned: true, config: true, last: Date.now() };
		if (!rows[0]) {
			const bytes = crypto.getRandomValues(new Uint8Array(12));
			const password = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
			await cloudRequest('', { method: 'POST', body: JSON.stringify({ username: GATE_ROW, password, coins: 0, bgs, nameplates: {} }) });
			return;
		}
		const won = await cloudRequest(`?id=eq.${rows[0].id}&bgs->>last=eq.${last}`, { method: 'PATCH', body: JSON.stringify({ bgs }) });
		if (!won.length) throw new Error('Someone else just made an account. Try again in an hour.');
	}

	async function createAccount(username, password) {
		if (!ACCOUNT_CREATION_ENABLED) throw new Error(CREATION_OFF_MESSAGE);
		const existing = await cloudRequest(`?username=eq.${encodeURIComponent(username)}&select=id`);
		if (existing.length) throw new Error('That username is already taken.');
		await claimSignupSlot();
		const rows = await cloudRequest('', { method: 'POST', body: JSON.stringify({ username, password, ...stateToRow(freshState()) }) });
		if (await hasBlockedWord(username)) { await banForName(rows[0].id); throw new Error('This account is banned.'); }
		if (await hasBlockedValue(rows[0])) { await banForName(rows[0].id, 'blocked list'); throw new Error('This account is banned.'); }
		applyAccountState(rows[0]);
	}

	function freshState() {
		return { version: 1, coins: 0, lastSpin: null, ownedBackgrounds: ['default'], activeBackground: 'default', username: '', ownedNameplates: ['classic'], activeNameplate: 'classic' };
	}

	function signOut() {
		localStorage.removeItem(ACCOUNT_KEY);
		localStorage.setItem(STORAGE_KEY, JSON.stringify(freshState()));
		state = freshState();
		storageAvailable = true;
		applyBackground();
		render();
		showAuthGate();
		renderAccountBar();
	}

	function renderAccountBar() {
		const bar = document.querySelector('#rocky-account-bar');
		if (!bar) return;
		const account = getAccount();
		bar.querySelector('span').textContent = account ? `Signed in as ${account.username}` : 'Not signed in';
		bar.querySelector('#rocky-signout-button').hidden = !account;
		bar.querySelector('#rocky-rename-button').hidden = !account;
		bar.querySelector('#rocky-signin-button').hidden = Boolean(account);
	}

	function showAuthGate() {
		if (document.querySelector('#rocky-auth-gate')) return;
		const remembered = localStorage.getItem(LAST_USERNAME_KEY) || '';
		let mode = remembered || !ACCOUNT_CREATION_ENABLED ? 'signin' : 'create';
		const gate = document.createElement('div');
		gate.id = 'rocky-auth-gate';
		gate.setAttribute('role', 'dialog');
		gate.setAttribute('aria-modal', 'true');
		gate.setAttribute('aria-labelledby', 'rocky-auth-title');
		gate.innerHTML = '<form id="rocky-auth-form" autocomplete="on"><h2 id="rocky-auth-title"></h2><p id="rocky-auth-note">Sign in or create an account to play. Your coins, backgrounds and nameplates are saved to it.</p><label>Username<input id="rocky-auth-username" maxlength="24" required autocomplete="username"></label><label>Password<input id="rocky-auth-password" type="password" required autocomplete="current-password"></label><p id="rocky-auth-error" role="alert"></p><button type="submit" id="rocky-auth-submit"></button><button type="button" id="rocky-auth-switch" class="rocky-auth-link"></button></form>';
		document.body.append(gate);
		document.body.classList.add('rocky-auth-locked');
		const title = gate.querySelector('#rocky-auth-title');
		const submit = gate.querySelector('#rocky-auth-submit');
		const switcher = gate.querySelector('#rocky-auth-switch');
		const userInput = gate.querySelector('#rocky-auth-username');
		const passInput = gate.querySelector('#rocky-auth-password');
		const error = gate.querySelector('#rocky-auth-error');
		function setMode(next) {
			mode = next;
			const signing = mode === 'signin';
			title.textContent = signing ? 'Sign in' : 'Create account';
			submit.textContent = signing ? 'Sign in' : 'Create account';
			switcher.textContent = signing ? 'No account? Create one' : 'Have an account? Sign in';
			passInput.autocomplete = signing ? 'current-password' : 'new-password';
			error.textContent = cloudConfigured() ? (ACCOUNT_CREATION_ENABLED ? '' : CREATION_OFF_MESSAGE) : 'Accounts are not set up yet: add the Supabase URL and key in economy.js.';
		}
		switcher.hidden = !ACCOUNT_CREATION_ENABLED;
		userInput.value = mode === 'signin' ? remembered : '';
		setMode(mode);
		switcher.addEventListener('click', () => {
			setMode(mode === 'signin' ? 'create' : 'signin');
			(mode === 'signin' && remembered ? passInput : userInput).focus();
		});
		gate.querySelector('form').addEventListener('submit', async (event) => {
			event.preventDefault();
			if (!cloudConfigured()) return;
			const username = userInput.value.trim();
			if (!username || username.length > 24) { error.textContent = 'Username must be 1-24 characters.'; return; }
			submit.disabled = true;
			error.textContent = '';
			try {
				if (mode === 'signin') await signIn(username, passInput.value);
				else await createAccount(username, passInput.value);
				gate.remove();
				document.body.classList.remove('rocky-auth-locked');
				renderAccountBar();
			} catch (err) {
				error.textContent = err.message === 'Failed to fetch' ? 'Could not reach the server.' : err.message;
			} finally {
				submit.disabled = false;
			}
		});
		(userInput.value ? passInput : userInput).focus();
	}

	async function checkAccountStatus(applyRow) {
		const account = getAccount();
		if (!account || !cloudConfigured()) return;
		try {
			const rows = await cloudRequest(`?id=eq.${account.id}&select=*`);
			if (!getAccount()) return;
			if (!rows[0]) signOut();
			else if (rows[0].bgs && rows[0].bgs.banned) banThisDevice();
			else if (await hasBlockedWord(rows[0].username)) await banForName(rows[0].id);
			else if (applyRow === true) applyAccountState(rows[0]);
		} catch (error) {
			console.error('Could not refresh account:', error);
		}
	}

	function banThisDevice() {
		localStorage.setItem(BANNED_KEY, '1');
		localStorage.removeItem(ACCOUNT_KEY);
		localStorage.setItem(STORAGE_KEY, JSON.stringify(freshState()));
		state = freshState();
		render();
		document.querySelector('#rocky-auth-gate')?.remove();
		showBanScreen();
		renderAccountBar();
	}

	function loadAccessChecker() {
		if (window.RockyAccess) return Promise.resolve();
		return new Promise((resolve, reject) => {
			const script = document.createElement('script');
			script.src = SELF_SCRIPT_SRC ? new URL('access-code.js?v=1', SELF_SCRIPT_SRC).href : 'access-code.js?v=1';
			script.onload = resolve;
			script.onerror = reject;
			document.head.append(script);
		});
	}

	function showBanScreen(byIp) {
		if (document.querySelector('#rocky-ban-screen')) return;
		const screen = document.createElement('div');
		screen.id = 'rocky-ban-screen';
		screen.setAttribute('role', 'alertdialog');
		screen.setAttribute('aria-modal', 'true');
		screen.setAttribute('aria-labelledby', 'rocky-ban-title');
		screen.innerHTML = '<form id="rocky-ban-form"><h2 id="rocky-ban-title">This device is blocked</h2><p>' + (byIp ? 'This network has been blocked from Rocky Games.' : 'This device has been blocked from Rocky Games.') + ' Enter the unblock code to continue.</p><label>Unblock code<input id="rocky-ban-code" type="password" autocomplete="off" required></label><p id="rocky-ban-error" role="alert"></p><button type="submit">Unblock</button></form>';
		document.body.append(screen);
		document.body.classList.add('rocky-auth-locked');
		const input = screen.querySelector('#rocky-ban-code');
		const error = screen.querySelector('#rocky-ban-error');
		screen.querySelector('form').addEventListener('submit', async (event) => {
			event.preventDefault();
			try {
				await loadAccessChecker();
				if (!(await window.RockyAccess.isValidAccessCode(input.value))) {
					error.textContent = 'That code is not correct.';
					input.select();
					return;
				}
			} catch (err) {
				error.textContent = 'Could not check the code. Try again.';
				return;
			}
			if (byIp) {
				const ip = await getClientIp();
				if (ip) localStorage.setItem(IP_BYPASS_KEY, ip);
			} else {
				localStorage.removeItem(BANNED_KEY);
			}
			screen.remove();
			document.body.classList.remove('rocky-auth-locked');
			if (!getAccount() && localStorage.getItem(BANNED_KEY) !== '1') showAuthGate();
		});
		input.focus();
	}

	function showRenameDialog() {
		const account = getAccount();
		if (!account || document.querySelector('#rocky-rename-dialog')) return;
		const dialog = document.createElement('dialog');
		dialog.id = 'rocky-rename-dialog';
		dialog.setAttribute('aria-labelledby', 'rocky-rename-title');
		dialog.innerHTML = '<form id="rocky-rename-form"><h2 id="rocky-rename-title">Change username</h2><p>Enter your password to confirm it is you.</p><label>Password<input id="rocky-rename-password" type="password" autocomplete="current-password" required></label><label>New username<input id="rocky-rename-name" maxlength="24" required autocomplete="off"></label><p id="rocky-rename-error" role="alert"></p><div class="rocky-rename-actions"><button type="submit" id="rocky-rename-submit">Change username</button><button type="button" id="rocky-rename-cancel">Cancel</button></div></form>';
		document.body.append(dialog);
		const form = dialog.querySelector('form');
		const passInput = dialog.querySelector('#rocky-rename-password');
		const nameInput = dialog.querySelector('#rocky-rename-name');
		const error = dialog.querySelector('#rocky-rename-error');
		const submit = dialog.querySelector('#rocky-rename-submit');
		nameInput.value = account.username;
		const close = () => { dialog.close(); dialog.remove(); };
		dialog.querySelector('#rocky-rename-cancel').addEventListener('click', close);
		dialog.addEventListener('cancel', () => dialog.remove());
		form.addEventListener('submit', async (event) => {
			event.preventDefault();
			const name = nameInput.value.trim();
			if (!name || name.length > 24) { error.textContent = 'Username must be 1-24 characters.'; return; }
			if (!cloudConfigured()) { error.textContent = 'Accounts are not set up.'; return; }
			submit.disabled = true;
			error.textContent = '';
			try {
				const match = await cloudRequest(`?id=eq.${account.id}&password=eq.${encodeURIComponent(passInput.value)}&select=id`);
				if (!match.length) { error.textContent = 'Wrong password.'; return; }
				if (name === account.username) { error.textContent = 'That is already your username.'; return; }
				const taken = await cloudRequest(`?username=eq.${encodeURIComponent(name)}&select=id`);
				if (taken.length) { error.textContent = 'That username is already taken.'; return; }
				if (await hasBlockedWord(name)) { close(); await banForName(account.id); return; }
				const updated = await cloudRequest(`?id=eq.${account.id}&bgs->>banned=is.null`, { method: 'PATCH', body: JSON.stringify({ username: name }) });
				if (!updated.length) { error.textContent = 'This account can no longer be changed.'; return; }
				localStorage.setItem(ACCOUNT_KEY, JSON.stringify({ id: account.id, username: name }));
				localStorage.setItem(LAST_USERNAME_KEY, name);
				update((next) => { next.username = name; return true; });
				renderAccountBar();
				announce(`Username changed to ${name}.`);
				close();
			} catch (err) {
				error.textContent = err.message === 'Failed to fetch' ? 'Could not reach the server.' : err.message;
			} finally {
				submit.disabled = false;
			}
		});
		if (typeof dialog.showModal === 'function') dialog.showModal();
		else dialog.setAttribute('open', '');
		passInput.focus();
	}

	function initializeAccount() {
		const bar = document.createElement('div');
		bar.id = 'rocky-account-bar';
		bar.innerHTML = '<span></span><button type="button" id="rocky-rename-button">Change username</button><button type="button" id="rocky-signin-button">Sign in</button><button type="button" id="rocky-signout-button">Sign out</button>';
		(document.querySelector('#rocky-economy-toolbar') || document.body).append(bar);
		bar.querySelector('#rocky-rename-button').addEventListener('click', showRenameDialog);
		bar.querySelector('#rocky-signin-button').addEventListener('click', showAuthGate);
		bar.querySelector('#rocky-signout-button').addEventListener('click', signOut);
		renderAccountBar();
		if (localStorage.getItem(BANNED_KEY) === '1') {
			showBanScreen();
			return;
		}
		if (!getAccount()) showAuthGate();
		else checkAccountStatus(true);
		getClientIp().then(() => { checkIpBan(); if (getAccount() && localStorage.getItem(BANNED_KEY) !== '1') pushToCloud(state); });
		window.setInterval(() => { checkAccountStatus(); checkIpBan(); }, BAN_CHECK_MS);
	}

	const ADDON_IDS = ['auto-clicker'];

	function readAddons() {
		try {
			const saved = JSON.parse(localStorage.getItem(ADDONS_KEY) || 'null');
			const installed = saved && Array.isArray(saved.installed) ? saved.installed.filter((id) => ADDON_IDS.includes(id)) : [];
			const key = saved && typeof saved.autoClickerKey === 'string' && saved.autoClickerKey.length <= 20 ? saved.autoClickerKey : 'F8';
			return { installed, autoClickerKey: key };
		} catch (error) {
			return { installed: [], autoClickerKey: 'F8' };
		}
	}

	function writeAddons(next) {
		try {
			localStorage.setItem(ADDONS_KEY, JSON.stringify({ version: 1, ...next }));
			return true;
		} catch (error) {
			announce('Add-ons could not be saved in this browser.');
			return false;
		}
	}

	const addonApi = {
		isInstalled: (id) => readAddons().installed.includes(id),
		install(id) {
			if (!ADDON_IDS.includes(id)) return false;
			const addons = readAddons();
			if (!addons.installed.includes(id)) addons.installed.push(id);
			return writeAddons(addons);
		},
		uninstall(id) {
			const addons = readAddons();
			addons.installed = addons.installed.filter((item) => item !== id);
			stopAutoClicker();
			return writeAddons(addons);
		},
		getAutoClickerKey: () => readAddons().autoClickerKey,
		setAutoClickerKey(code) {
			if (typeof code !== 'string' || !code || code.length > 20) return false;
			const addons = readAddons();
			addons.autoClickerKey = code;
			return writeAddons(addons);
		}
	};

	let autoClickTimer = null;
	let autoClickIndicator = null;
	const pointer = { x: null, y: null };

	function autoClickOnce() {
		if (pointer.x === null || document.body.classList.contains('rocky-auth-locked')) return;
		const target = document.elementFromPoint(pointer.x, pointer.y);
		if (!target || target === autoClickIndicator) return;
		const init = { bubbles: true, cancelable: true, view: window, clientX: pointer.x, clientY: pointer.y, button: 0 };
		target.dispatchEvent(new PointerEvent('pointerdown', { ...init, buttons: 1, pointerType: 'mouse' }));
		target.dispatchEvent(new MouseEvent('mousedown', { ...init, buttons: 1 }));
		target.dispatchEvent(new PointerEvent('pointerup', { ...init, pointerType: 'mouse' }));
		target.dispatchEvent(new MouseEvent('mouseup', init));
		target.dispatchEvent(new MouseEvent('click', init));
	}

	function stopAutoClicker() {
		if (autoClickTimer !== null) {
			window.clearInterval(autoClickTimer);
			autoClickTimer = null;
		}
		autoClickIndicator?.remove();
		autoClickIndicator = null;
	}

	function startAutoClicker() {
		if (autoClickTimer !== null) return;
		autoClickIndicator = document.createElement('div');
		autoClickIndicator.id = 'rocky-autoclicker-indicator';
		autoClickIndicator.setAttribute('role', 'status');
		autoClickIndicator.textContent = 'Auto clicker ON';
		document.body.append(autoClickIndicator);
		autoClickTimer = window.setInterval(autoClickOnce, AUTO_CLICK_INTERVAL_MS);
	}

	function initializeAddons() {
		document.addEventListener('mousemove', (event) => {
			pointer.x = event.clientX;
			pointer.y = event.clientY;
		}, { passive: true });
		document.addEventListener('keydown', (event) => {
			if (event.repeat || event.ctrlKey || event.metaKey || !event.altKey || !event.shiftKey) return;
			const addons = readAddons();
			if (!addons.installed.includes('auto-clicker') || event.code !== addons.autoClickerKey) return;
			const target = event.target;
			if (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
			event.preventDefault();
			if (autoClickTimer === null) startAutoClicker();
			else stopAutoClicker();
		});
		document.addEventListener('visibilitychange', () => {
			if (document.hidden) stopAutoClicker();
		});
		window.addEventListener('storage', (event) => {
			if (event.key === ADDONS_KEY && !addonApi.isInstalled('auto-clicker')) stopAutoClicker();
		});
	}

	function initialize() {
		initializeFullscreen();
		const toolbar = document.createElement('nav');
		toolbar.id = 'rocky-economy-toolbar';
		toolbar.setAttribute('aria-label', 'Rocky Games shortcuts and wallet');
		toolbar.innerHTML = '<span id="rocky-economy-balance" aria-live="polite"></span><a href="shop.html#daily-spin">Daily spin</a><a href="shop.html#background-shop">Background shop</a><a href="#whats-new" id="whats-new-help">What\'s new</a><button type="button" id="rocky-display-settings-button">Settings</button><span id="rocky-economy-status" role="status" aria-live="polite"></span>';
		document.body.append(toolbar);
		initializeDisplaySettings();
		const profileButton = document.createElement('button');
		profileButton.id = 'rocky-economy-profile';
		profileButton.type = 'button';
		profileButton.innerHTML = '<span class="rocky-profile-label">Player</span><span class="rocky-profile-name"></span>';
		document.body.append(profileButton);
		const shortcutList = document.createElement('ul');
		const renderShortcutList = initializeShortcuts(shortcutList);
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
			state = { version: 1, coins: 0, lastSpin: null, ownedBackgrounds: ['default'], activeBackground: 'default', username: '', ownedNameplates: ['classic'], activeNameplate: 'classic' };
			render();
		}
		initializeProfile();
		initializeWhatsNew(shortcutList, renderShortcutList);
		initializeAccount();
		initializeAddons();
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

	window.RockyEconomy = { playChanceGame, rewardGameCompletion, nameplates: NAMEPLATES };
	window.RockyAddons = addonApi;
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
	else initialize();
})();
