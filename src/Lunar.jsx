import React, { useRef, useEffect, useState } from 'react'
import * as tf from '@tensorflow/tfjs'

export default function LanderMissionGame() {
  const canvasRef = useRef(null)
  const [mode, setMode] = useState('user')
  const modelRef = useRef(null)
  const [message, setMessage] = useState('')
  const startedRef = useRef(false)
  const stoppedRef = useRef(false)
  const userInput = useRef({ throttleUp: false, left: false, right: false }) // <-- Moved here

  let landingPadX;
  let landingPadY;
  let landingPadCenterX;

  function computeAdvice(state, padCenterX) {
    let throttleAdv = 0;
    let torqueAdv   = 0;

    if (state.y > 200) throttleAdv = 100;
    else if (state.y < 100) throttleAdv = 0;
    else throttleAdv = 50;

    if (Math.abs(state.x - padCenterX) < 200) throttleAdv = 0;

    const angleDeg = state.angle * (180 / Math.PI);
    if (angleDeg > 10) torqueAdv = -1;
    else if (angleDeg < -10) torqueAdv = 1;

    const dx = padCenterX - state.x;
    if (Math.abs(dx) > 200) {
      torqueAdv += dx > 0 ? 0.5 : -0.5;
    }

    const dist = Math.abs(dx);
    const vx = state.vx;

    if (dist > 800 && Math.abs(vx) > 60) {
      torqueAdv += vx > 0 ? -1 : +1;
    } else if (dist > 400 && Math.abs(vx) > 30) {
      torqueAdv += vx > 0 ? -1 : +1;
    } else if (Math.abs(vx) > 15) {
      torqueAdv += vx > 0 ? -1 : +1;
    }

    throttleAdv = Math.max(0, Math.min(100, throttleAdv));
    torqueAdv = Math.max(-1, Math.min(1, torqueAdv));

    return [throttleAdv, torqueAdv];
  }

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const W = 600, H = 400

    const WORLD_WIDTH = 2000
    const G = 9.8, DT = 1 / 60, mass = 1, I = 0.1
    const LAUNCH_ZONE = 200, LANDING_ZONE = 200

    let throttle = 0

    let state = {
      x: 100, y: 100,
      vx: 0, vy: 0,
      angle: 0, omega: 0
    }

    const terrain = generateTerrain(WORLD_WIDTH, H)
    landingPadX = WORLD_WIDTH - LANDING_ZONE
    landingPadY = terrain[landingPadX]
    landingPadCenterX = landingPadX + LANDING_ZONE / 2

    const onKeyDown = e => {
      if (!stoppedRef.current) startedRef.current = true
      if (e.key === 'ArrowUp') userInput.current.throttleUp = true
      if (e.key === 'ArrowLeft') userInput.current.left = true
      if (e.key === 'ArrowRight') userInput.current.right = true
    }

    const onKeyUp = e => {
      if (e.key === 'ArrowUp') userInput.current.throttleUp = false
      if (e.key === 'ArrowLeft') userInput.current.left = false
      if (e.key === 'ArrowRight') userInput.current.right = false
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    function generateTerrain(width, height) {
      let noise = Array.from({ length: Math.floor(width * 0.05) }, () =>
        Math.random() * height * 0.3 + height * 0.6
      )
      let smooth = []
      for (let i = 0; i < width; i++) {
        let idx = Math.floor(i * 0.05)
        let frac = (i * 0.05) - idx
        let val = noise[idx] * (1 - frac) + (noise[idx + 1] || noise[idx]) * frac
        smooth.push(val)
      }
      smooth.fill(smooth[LAUNCH_ZONE], 0, LAUNCH_ZONE)
      smooth.fill(smooth[width - LANDING_ZONE - 1], width - LANDING_ZONE, width)
      return smooth
    }

    function step(throttleInput, torqueInput) {
      if (mode === 'user') {
        if (userInput.current.throttleUp) {
          throttle += 0.02
        } else {
          throttle -= 0.02
        }
        throttle = Math.max(0, Math.min(throttle, 1))
      } else {
        throttle = throttleInput
      }

      const thrust = throttle * 20
      const fx = Math.sin(state.angle) * thrust
      const fy = -Math.cos(state.angle) * thrust + G * mass
      const ax = fx / mass, ay = fy / mass

      state.vx += ax * DT
      state.vy += ay * DT
      state.x += state.vx * DT
      state.y += state.vy * DT

      const torque = torqueInput * 1.5
      const alpha = torque / I
      state.omega += alpha * DT
      state.omega *= 0.98
      state.angle += state.omega * DT
    }

    function draw() {
      ctx.clearRect(0, 0, W, H)
      const inLandingZone = state.x >= landingPadX && state.x <= landingPadX + LANDING_ZONE
      const camX = inLandingZone ? WORLD_WIDTH - W : state.x - W / 2

      ctx.save()
      ctx.translate(-camX, 0)

      ctx.beginPath()
      ctx.moveTo(0, terrain[0])
      for (let i = 1; i < terrain.length; i++) {
        ctx.lineTo(i, terrain[i])
      }
      ctx.lineTo(WORLD_WIDTH, H)
      ctx.lineTo(0, H)
      ctx.closePath()
      ctx.fillStyle = '#654321'
      ctx.fill()

      ctx.fillStyle = 'green'
      ctx.fillRect(0, terrain[0] - 4, LAUNCH_ZONE, 4)

      ctx.fillStyle = 'red'
      ctx.fillRect(landingPadX, landingPadY - 4, LANDING_ZONE, 4)

      ctx.save()
      ctx.translate(state.x, state.y)
      ctx.rotate(state.angle)
      ctx.fillStyle = 'silver'
      ctx.fillRect(-6, -10, 12, 20)
      ctx.beginPath()
      ctx.moveTo(-6, -10)
      ctx.lineTo(0, -18)
      ctx.lineTo(6, -10)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = 'darkgray'
      ctx.fillRect(-10, 0, 4, 10)
      ctx.fillRect(6, 0, 4, 10)
      ctx.restore()
      ctx.restore()

      ctx.fillStyle = 'black'
      ctx.font = '14px monospace'
      ctx.fillText(`Throttle: ${(throttle * 100).toFixed(0)}%`, 10, 20)
      ctx.fillText(`x: ${Math.floor(2000 - state.x)}`, 10, 35)
      ctx.fillText(`↑ Throttle | ← Left | → Right`, 0, H - 200)
    }

    function checkLanding() {
      const tx = Math.floor(state.x)
      const terrainY = terrain[tx] || 9999
      const inPad = state.x >= landingPadX && state.x <= landingPadX + LANDING_ZONE
      const outOfPadRight = state.x > landingPadX + LANDING_ZONE

      if (state.y >= terrainY - 5) {
        setMessage(inPad ? '🎉 Mission Complete' : '💥 Crash! Try Again.')
        cancelAnimationFrame(raf)
        stoppedRef.current = true
        return
      }

      if (stoppedRef.current && outOfPadRight) {
        setMessage('🚫 Drifted beyond Landing Zone. Failed.')
        cancelAnimationFrame(raf)
      }
    }

    function reset() {
      state = { x: 100, y: 100, vx: 0, vy: 0, angle: 0, omega: 0 }
      throttle = 0
      setMessage('')
      startedRef.current = false
      stoppedRef.current = false
      requestAnimationFrame(loop)
    }

    let raf
    const loop = () => {
      let torque = 0
      let currentThrottle = throttle

      if (mode === 'user') {
        if (userInput.current.left) torque = -1
        else if (userInput.current.right) torque = 1
      } else {
        const [advThrottle, advTorque] = computeAdvice(state, landingPadCenterX)
        currentThrottle = advThrottle
        torque = advTorque
      }

      if (startedRef.current && !stoppedRef.current) {
        step(currentThrottle, torque)
      }

      draw()
      checkLanding()
      raf = requestAnimationFrame(loop)
    }

    if (mode === 'ai') startedRef.current = true
    loop()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [mode])

  return (
    <div>
      <h2>🛰️ Lander Mission(land the rover in the red region)</h2>
      <button onClick={() => setMode('user')}>Play</button>
      <button onClick={() => setMode('ai')}>AI Mode</button>
      {mode === 'ai' && (
        <div className="ai-container">
          <h2>AI Mode</h2>
        </div>
      )}
      {message && (
        <div style={{ margin: '10px 0', color: message.includes('Crash') ? 'red' : 'green' }}>
          {message}
          <button onClick={() => window.location.reload()}>Reset</button>
        </div>
      )}
      
      <canvas ref={canvasRef} width={600} height={400} />
    </div>
  )
}
