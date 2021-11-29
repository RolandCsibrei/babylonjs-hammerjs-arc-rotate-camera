<template>
  <q-page>
    <canvas ref="bjsCanvas" width="1920" height="1080" class="bjs-canvas" />
  </q-page>
</template>

<script lang="ts">
import { Engine } from '@babylonjs/core'
import { defineComponent, onMounted, onUnmounted, Ref, ref } from '@vue/composition-api'
import { HammerJsInputTestScene } from 'src/scenes/HammerJsInputTestScene'

export default defineComponent({
  name: 'PageIndex',
  setup(_, { root }) {
    const $q = root.$q
    const bjsCanvas = ref<HTMLCanvasElement | null>(null)
    const isDrawerOpen = ref(false)
    const isLoading = ref(true)
    const isAudioTested = ref(false)
    const isStarted = ref(false)
    const isGuiUnlocked = ref(true)
    const isTimeForTheShow = ref(false)
    const isRotation = ref(false)
    const timeDelta = ref(1)

    let engine: Engine

    let scene: HammerJsInputTestScene

    onMounted(async () => {
      if (bjsCanvas?.value) {
        scene = new HammerJsInputTestScene(bjsCanvas.value)
        engine = scene.getEngine()
        await scene.initScene()
        window.addEventListener('resize', onWindowResize)
        isLoading.value = false

        startClassic()
      }
    })

    onUnmounted(() => {
      cleanup()
    })

    const cleanup = () => {
      window.removeEventListener('resize', onWindowResize)
    }

    const gotoBabylonSite = () => {
      window.open('https://www.babylonjs.com', '_blank')
    }

    const toggleFullScreen = async () => {
      if ($q.fullscreen.isCapable) {
        await $q.fullscreen.toggle()
      }
    }

    const onWindowResize = () => {
      if (bjsCanvas.value) {
        bjsCanvas.value.width = bjsCanvas.value?.clientWidth
        bjsCanvas.value.height = bjsCanvas.value?.clientHeight
      }
      engine.resize()
    }

    const showDebug = async () => {
      isDrawerOpen.value = false
      await scene?.showDebug()
    }

    const start = async () => {
      if ($q.fullscreen.isCapable) {
        await $q.fullscreen.toggle()
        startClassic()
      }
    }

    const startClassic = () => {
      scene.stopIntroMusic()
      scene.startScene()

      let opacity = 0
      function fade() {
        if (opacity < 1) {
          opacity += 0.015
          if (opacity < 1) {
            window.requestAnimationFrame(fade)
          }
          if (bjsCanvas.value) {
            bjsCanvas.value.style.opacity = opacity.toPrecision(4)
          }
        }
      }

      window.requestAnimationFrame(fade)

      isStarted.value = true
      setTimeout(() => {
        isGuiUnlocked.value = true
      }, 10000)
    }
    return {
      isAudioTested,
      isGuiUnlocked,
      start,
      startClassic,
      gotoBabylonSite,
      bjsCanvas,
      toggleFullScreen,
      isStarted,
      showDebug,
      isTimeForTheShow,
      timeDelta,
      isRotation,
      isLoading,
      isDrawerOpen
    }
  }
})
</script>

<style lang="sass">
.bjs-canvas
  width: 100%
  height: 100%
  opacity: 0
.bjs-link
  cursor: pointer
.bjs-logo
  --animate-duration: 1.2s
  animation-delay: 10s
.fullscreenbuttton
  --animate-duration: 2s
aside
  background-color: rgba(0,0,0,0.3) !important
</style>
