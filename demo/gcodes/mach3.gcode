G20 ;(Units: Inches)
F140 ;(Initialize feed rate)
G53 G90 G40 ;(Turn on absolute pos without cut compensation)
S900 ;(Global DTHC ON/OFF is ON)
S510 ;(Turn off DTHC at the beginning)
S3128 ;(Preset volts)
S502 ;(DTHC Delay set to 0.1 seconds)
S701 ;(Clear S Register)
;(M00 , Pause. Check the DTHC Settings)
G00 Z1.5 ;(Travel height)
G00 X1.82 Y6.05;(Go to start point)
;(Probe for live pierce height)
M900 ;(Check for z active)
G00 Z0.2 ;(Start calibrating Z)
G31 Z-11.8 F55 ;(Start probe touch-off)
G92 Z0 ;(Save Z axis ref)
G00 Z0.039 ;(Switch offset Lift)
G92 Z0 ;(Save Z axis ref again)
G00 Z0.15 ;(Pierce height)
M03 ;(Torch mode on)
M11P1 ;(Quick torch on)
G04 P0.2
G01 Z0.06 F55.0
S20 ;(DTHC is on)
;(Cut square, tube #0 )
G02 X2.22 Y6.45 R0.4
G01 Y6.45
G01 X2.22
G01 Y5.65
G01 X1.42
G01 Y6.45
G01 X2.22
S10 ;(DTHC OFF)
M10P1 ;(Quick Torch off)

M05 ;(Torch mode off)
G00 Z1.5 ;(Travel height)
G00 X3.845 Y2 ;(Go to start point)
;(Probe for live pierce height)
M900 ;(Check for z active)
G00 Z0.2 ;(Start calibrating Z)
G31 Z-11.8 F55 ;(Start probe touch-off)
G92 Z0 ;(Save Z axis ref)
G00 Z0.039 ;(Switch offset Lift)
G92 Z0 ;(Save Z axis ref again)
G00 Z0.15 ;(Pierce height)
M03 ;(Torch mode on)
M11P1 ;(Quick torch on)
G04 P0.2
G01 Z0.06 F55.0
S20 ;(DTHC is on)
;(Cut circle #0, tube #1, side #1 )
G02 X3.59 Y1.745 R0.255 F140
G02 X4.1 Y2.255 R0.255
G02 X3.59 Y1.745 R0.255
S10 ;(DTHC OFF)
M10P1 ;(Quick Torch off)

M05 ;(Torch mode off)
G00 Z1.5 ;(Travel height)
G00 X0 Y0 ;(Go to origin)
S900 ;(Global DTHC ON/OFF is ON)
S10 ;(DTHC is off)
S701 ;(clear S Register)
M05 M30 ;(End and reset program)
