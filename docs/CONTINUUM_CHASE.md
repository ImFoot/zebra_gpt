# Continuum Chase

This is the first playable slice of **ZEBRA!! — The Last Original Thought**. Run `Play Continuum Chase.cmd` from the repository. To edit the slice, import `game/project.godot` in Godot 4.7 and press F5.

| Action | Xbox controller | Keyboard |
| --- | --- | --- |
| Start, confirm, or retry after being caught | A | Enter |
| Steer | Left stick or D-pad | A/D or left/right arrows |
| Gallop | Right trigger | W or up arrow |
| Brake | Left trigger | S or down arrow |
| Jump | A | Space |
| Burst | Hold B | Hold Shift |
| Throw a wine bottle | RB | Q |
| Barf an oil slick | LB | E |
| Front three-quarter hero camera | Hold R3 (right stick click) | Hold C |
| Pause or resume | Menu | Esc or P |
| Return to the latest checkpoint | Y | R |
| Return to title from a menu | X | Backspace |

Stan mounts Zebra in Cinema Row. Hold the accelerator to keep the pursuit behind you, and use burst when the pursuit meter rises. Steer around the lit barriers or jump them. The chase covers five checkpoints, sends a drone over the boulevard, slows down for Stan's cabernet, and ends at the transit tunnel. A steady gallop takes about three minutes.

Throw a bottle when the targeting brackets appear around a drone. A hit brings it down and takes pressure off the chase. Drop an oil slick with a bike behind you and hold your line long enough for its front tire to cross the spill. Bikes off your line can miss the slick. The attack cards show when each move has recharged, and the checkpoint resets both moves. The first bike and drone appear in Cinema Row. Stan's attack reactions use his own dialogue, a tipsy windup, and an exaggerated retch.

Treatment S14 and S16 supplied the mount, pursuit, joke, and escape beats. The original mounted illustration, IMG-01, defines both characters. IMG-29 and IMG-46 guide the chase and street atmosphere. The route is a continuous road with lateral steering and scripted set pieces. Stan attaches to a saddle socket and Zebra's gait follows four hoof cycles. The [hero asset manifest](HERO_ASSETS.json) records the approved image, local references, and mesh and rig provenance.

The prototype uses Godot Forward+ with wet road materials, screen-space reflections, rain, and depth fog. Vulkan synchronization was disabled for the Windows test session, where it throttled interactive rendering. The game caps the render loop at 90 FPS.

The title, chase, and wine scene reached the 90 FPS cap in short capture runs on an RTX 5060 Ti. An automated Godot run injected keyboard and Xbox-format events for title start, analog steering and triggers, jump, burst, hero view, pause, being caught, checkpoint recovery, and the complete tunnel finish. Rendered and headless checks injected Xbox-format inputs for bottle throws and oil slicks. They verified the drone takedown, the bike skid, a miss in a separate lane, and the recharge and reset behavior. The updated chase also completed a full automated run. A physical controller and sustained performance across the entire route still need testing.

The character pass used 190 Tripo credits. The game runs separate humanoid and equine skeletons. The chase timing drives Zebra’s gait, Stan’s balance, and his coat and hand props.

[Hero close-up](previews/continuum-stan-zebra.png) · [Full mounted view](previews/continuum-stan-zebra-full.png)

