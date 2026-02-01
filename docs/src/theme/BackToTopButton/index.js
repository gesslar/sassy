/* eslint-disable jsdoc/require-jsdoc */
import React, {useState, useEffect, useCallback} from 'react'
import clsx from 'clsx'

import styles from './styles.module.css'

export default function BackToTopButton() {
  const [shown, setShown] = useState(false)

  useEffect(() => {
    let ticking = false
    const onScroll = () => {
      if(!ticking) {
        window.requestAnimationFrame(() => {
          setShown(window.scrollY > 80)
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', onScroll, {passive: true})
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToTop = useCallback(() => {
    window.scrollTo({top: 0, behavior: 'smooth'})
  }, [])

  return (
    <button
      aria-label="Scroll back to top"
      className={clsx(
        'clean-btn',
        styles.backToTopButton,
        shown && styles.backToTopButtonShow,
      )}
      type="button"
      onClick={scrollToTop}
    />
  )
}
