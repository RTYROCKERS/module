import React, { useRef, useEffect, useState } from 'react'
import * as tf from '@tensorflow/tfjs'

export default function LanderMissionGame() {
  const canvasRef = useRef(null)
  const [mode, setMode] = useState('user')
  const modelRef = useRef(null)
  const [message, setMessage] = useState('')
  const startedRef = useRef(false)
  const stoppedRef = useRef(false)

  useEffect(() => {
    tf.loadLayersModel('/models/lander_policy/model.json')
      .then(m => modelRef.current = m)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const W = 600, H = 400

    const WORLD_WIDTH = 2000
    const G = 9.8, DT = 1 / 60, mass = 1, I = 0.1
    const LAUNCH_ZONE = 200, LANDING_ZONE = 200

    let throttle = 0
    let userInput = { throttleUp: false, left: false, right: false }

    let state = {
      x: 100, y: 100, // Start elevated
      vx: 0, vy: 0,
      angle: 0, omega: 0
    }

    const terrain = generateTerrain(WORLD_WIDTH, H)
    const landingPadX = WORLD_WIDTH - LANDING_ZONE
    const landingPadY = terrain[landingPadX]

    const onKeyDown = e => {
      if (!stoppedRef.current) startedRef.current = true
      if (e.key === 'ArrowUp') userInput.throttleUp = true
      if (e.key === 'ArrowLeft') userInput.left = true
      if (e.key === 'ArrowRight') userInput.right = true
    }

    const onKeyUp = e => {
      if (e.key === 'ArrowUp') userInput.throttleUp = false
      if (e.key === 'ArrowLeft') userInput.left = false
      if (e.key === 'ArrowRight') userInput.right = false
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
        // Only update throttle in user mode
        if (mode === 'user') {
            if (userInput.throttleUp) {
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
    //   ctx.fillStyle = '#111'
    //   ctx.fillRect(0, 0, W, H)

      const inLandingZone = state.x >= landingPadX && state.x <= landingPadX + LANDING_ZONE
      const camX = inLandingZone ? WORLD_WIDTH - W : state.x - W / 2

      ctx.save()
      ctx.translate(-camX, 0)

      // Terrain
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

      // Launch and landing pads
      ctx.fillStyle = 'green'
      ctx.fillRect(0, terrain[0] - 4, LAUNCH_ZONE, 4)

      ctx.fillStyle = 'red'
      ctx.fillRect(landingPadX, landingPadY - 4, LANDING_ZONE, 4)

    
      // Lander (sphere)
        ctx.save()
        ctx.translate(state.x, state.y)
        ctx.rotate(state.angle)
        ctx.fillStyle = 'silver'

        // Body
        ctx.fillRect(-6, -10, 12, 20)

        // Cone
        ctx.beginPath()
        ctx.moveTo(-6, -10)
        ctx.lineTo(0, -18)
        ctx.lineTo(6, -10)
        ctx.closePath()
        ctx.fill()

        // Boosters
        ctx.fillStyle = 'darkgray'
        ctx.fillRect(-10, 0, 4, 10)
        ctx.fillRect(6, 0, 4, 10)

        ctx.restore()


      ctx.restore()

      // HUD
      ctx.fillStyle = 'black'
      ctx.font = '14px monospace'
      ctx.fillText(`Throttle: ${(throttle * 100).toFixed(0)}%`, 10, 20)
      ctx.fillText(`x: ${Math.floor(2000-state.x)}`, 10, 35)
      ctx.fillText(`↑ Throttle | ← Left | → Right`, 0, H-200 )
    }

    function predictAI() {
      const m = modelRef.current
      if (!m) return [0, 0]
      const input = tf.tensor2d([[state.x / WORLD_WIDTH, state.y / H, state.vx / 10, state.vy / 10, state.angle / Math.PI, state.omega / 5]])
      const [t, o] = m.predict(input).arraySync()[0]
      tf.dispose(input)
      return [Math.min(Math.max(t, 0), 1), Math.min(Math.max(o, -1), 1)]
    }

    function checkLanding() {
        const tx = Math.floor(state.x)
        const terrainY = terrain[tx] || 9999
        const inPad = state.x >= landingPadX && state.x <= landingPadX + LANDING_ZONE
        const outOfPadRight = state.x > landingPadX + LANDING_ZONE

        if (state.y >= terrainY - 5) {
            if (inPad) {
            setMessage('🎉 Mission Complete')
            } else {
            setMessage('💥 Crash! Try Again.')
            }
            cancelAnimationFrame(raf)
            stoppedRef.current = true
            return
        }

        // Already landed but moved out
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
            if (userInput.left) torque = -1
            else if (userInput.right) torque = 1
        } else {
            const [aiThrottle, aiTorque] = predictAI()
            currentThrottle = aiThrottle
            torque = aiTorque
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
          {/* Your AI mode content here */}
          <h2>AI Mode (not available)</h2>
          <p>The AI model is currently in development phase.</p>
        </div>
      )}
      {message && (
        <div style={{ margin: '10px 0', color: message.includes('Crash') ? 'red' : 'green' }}>
          {message}
          <button onClick={() => window.location.reload()}>Reset</button>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', margin: '10px 0' }}>
        <button
          onMouseDown={() => userInput.left = true}
          onMouseUp={() => userInput.left = false}
          onTouchStart={() => userInput.left = true}
          onTouchEnd={() => userInput.left = false}
        >
          ◀️ Left
        </button>

        <button
          onMouseDown={() => userInput.throttleUp = true}
          onMouseUp={() => userInput.throttleUp = false}
          onTouchStart={() => userInput.throttleUp = true}
          onTouchEnd={() => userInput.throttleUp = false}
        >
          🔼 Throttle
        </button>

        <button
          onMouseDown={() => userInput.right = true}
          onMouseUp={() => userInput.right = false}
          onTouchStart={() => userInput.right = true}
          onTouchEnd={() => userInput.right = false}
        >
          ▶️ Right
        </button>
      </div>

      <canvas ref={canvasRef} width={600} height={400} />
    </div>
  )
}
