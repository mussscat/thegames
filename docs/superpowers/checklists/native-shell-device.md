# Shell check on real devices (owner)

Open the build on the device (`npm run build && npm run preview -w @game/web -- --host`, then the LAN address), or the deployed one. Tick each line.

## iPhone, Safari tab and «Add to Home Screen» app
- [ ] Pull down on the menu, in a fight, in the shop: the page does not reload or stretch.
- [ ] Long-press a card, a joker, a pack, a coin: no «Save image / Copy» sheet.
- [ ] Long-press text (title, prices): nothing gets selected.
- [ ] Double-tap anywhere: no zoom. Pinch: no zoom.
- [ ] Swipe from the left edge: the game does not go «back».
- [ ] Shop is longer than the screen: it scrolls by itself; the last pack is not hidden under the bottom bar.
- [ ] Rotate the phone in the menu, fight and shop: no stuck layout.
- [ ] Cold start: a dark-blue screen with the title, no white flash.
- [ ] Settings: the switch, the volume slider and the selector still respond.

## Mac, Safari and Chrome
- [ ] Right-click a card: no context menu.
- [ ] Drag a card image with the mouse: no ghost image.
- [ ] Double-click text: nothing is selected.
- [ ] Ctrl + mouse wheel / trackpad pinch: the page does not zoom.
- [ ] Two-finger swipe left on the trackpad in the middle of a fight: does not navigate back.
- [ ] Click a button, then press Tab: a gold ring appears only after Tab.

Anything that fails: write the device, the OS version and the screen.
