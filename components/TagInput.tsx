'use client'

import { useEffect, useRef, useState } from 'react'

type Props = {
  value: string[]
  onChange: (tags: string[]) => void
  suggestions: string[]
  placeholder?: string
}

export default function TagInput({ value, onChange, suggestions, placeholder = 'Add a tag…' }: Props) {
  const [input, setInput] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const query = input.trim().toLowerCase()

  const filtered = suggestions.filter(
    s => !value.includes(s) && s.toLowerCase().includes(query),
  )

  const exactMatch = suggestions.some(s => s.toLowerCase() === query) || value.some(v => v.toLowerCase() === query)
  const showCreate = query.length > 0 && !exactMatch

  // All options for keyboard navigation
  const options: string[] = [...filtered, ...(showCreate ? [input.trim()] : [])]

  function addTag(tag: string) {
    const trimmed = tag.trim()
    if (!trimmed || value.includes(trimmed)) return
    onChange([...value, trimmed])
    setInput('')
    setActiveIndex(-1)
    inputRef.current?.focus()
  }

  function removeTag(tag: string) {
    onChange(value.filter(t => t !== tag))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, options.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0 && options[activeIndex]) {
        addTag(options[activeIndex])
      } else if (filtered.length > 0) {
        addTag(filtered[0])
      } else if (input.trim()) {
        addTag(input.trim())
      }
    } else if (e.key === 'Backspace' && input === '' && value.length > 0) {
      onChange(value.slice(0, -1))
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  const dropdownVisible = open && (filtered.length > 0 || showCreate)

  return (
    <div ref={containerRef} className="relative">
      {/* Tag pills + input */}
      <div
        className="flex flex-wrap gap-1.5 p-2 border border-gray-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-[#75AADB]/40 cursor-text min-h-[42px]"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map(tag => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 bg-[#002147]/8 text-[#002147] rounded-full"
          >
            {tag}
            <button
              type="button"
              onClick={e => { e.stopPropagation(); removeTag(tag) }}
              className="leading-none text-[#002147]/50 hover:text-red-500 transition-colors"
              aria-label={`Remove ${tag}`}
            >
              ×
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          value={input}
          onChange={e => { setInput(e.target.value); setOpen(true); setActiveIndex(-1) }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[100px] text-sm text-gray-800 placeholder:text-gray-400 outline-none bg-transparent py-0.5"
        />
      </div>

      {/* Dropdown */}
      {dropdownVisible && (
        <ul className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-52 overflow-y-auto">
          {filtered.map((tag, i) => (
            <li key={tag}>
              <button
                type="button"
                onMouseDown={e => { e.preventDefault(); addTag(tag) }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  activeIndex === i ? 'bg-gray-100 text-[#002147]' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tag}
              </button>
            </li>
          ))}

          {showCreate && (
            <li>
              <button
                type="button"
                onMouseDown={e => { e.preventDefault(); addTag(input.trim()) }}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                  activeIndex === filtered.length ? 'bg-gray-100 text-[#002147]' : 'text-[#002147] hover:bg-gray-50'
                } ${filtered.length > 0 ? 'border-t border-gray-100' : ''}`}
              >
                <span className="w-4 h-4 rounded-full bg-[#002147] text-white flex items-center justify-center text-[10px] font-bold shrink-0">+</span>
                Create &ldquo;{input.trim()}&rdquo;
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
