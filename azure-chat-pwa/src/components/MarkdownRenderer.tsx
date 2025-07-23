'use client'

import { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'
import DOMPurify from 'dompurify'
import mermaid from 'mermaid'
import 'katex/dist/katex.min.css'
import 'highlight.js/styles/github.css'

interface MarkdownRendererProps {
  content: string
}

// Initialize mermaid
if (typeof window !== 'undefined') {
  mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'strict',
    fontFamily: 'inherit',
  })
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Render mermaid diagrams
    const renderMermaid = async () => {
      if (!containerRef.current) return

      const mermaidElements = containerRef.current.querySelectorAll('.language-mermaid')
      
      for (let i = 0; i < mermaidElements.length; i++) {
        const element = mermaidElements[i] as HTMLElement
        const code = element.textContent || ''
        
        try {
          const id = `mermaid-${Date.now()}-${i}`
          const { svg } = await mermaid.render(id, code)
          
          // Create a container for the diagram
          const container = document.createElement('div')
          container.className = 'mermaid-container my-4'
          container.innerHTML = DOMPurify.sanitize(svg)
          
          // Replace the code block with the diagram
          element.parentElement?.replaceWith(container)
        } catch (error) {
          console.error('Error rendering mermaid diagram:', error)
          // Keep the original code block on error
        }
      }
    }

    renderMermaid()
  }, [content])

  // Sanitize content before rendering
  const sanitizedContent = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre', 'blockquote',
      'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'a', 'img',
      'hr', 'details', 'summary', 'span', 'div'
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel', 'src', 'alt', 'title', 'class',
      'id', 'style', 'colspan', 'rowspan', 'align'
    ],
    ALLOW_DATA_ATTR: false,
  })

  return (
    <div ref={containerRef} className="markdown-body prose prose-gray dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={{
          // Custom code block renderer
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          code(props: any) {
            const { className, children, ...rest } = props
            const match = /language-(\w+)/.exec(className || '')
            const language = match ? match[1] : ''
            const inline = !match
            
            if (!inline && language === 'mermaid') {
              return (
                <pre className={className}>
                  <code {...rest}>{children}</code>
                </pre>
              )
            }
            
            return inline ? (
              <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm" {...rest}>
                {children}
              </code>
            ) : (
              <div className="relative group">
                <pre className={className}>
                  <code {...rest}>{children}</code>
                </pre>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(String(children))
                  }}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-700 text-white px-2 py-1 rounded text-xs"
                >
                  Copy
                </button>
              </div>
            )
          },
          // Custom link renderer for security
          a({ href, children, ...props }) {
            const sanitizedHref = DOMPurify.sanitize(String(href || ''))
            return (
              <a
                href={sanitizedHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
                {...props}
              >
                {children}
              </a>
            )
          },
          // Custom image renderer
          img({ src, alt, ...props }) {
            const sanitizedSrc = DOMPurify.sanitize(String(src || ''))
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={sanitizedSrc}
                alt={alt}
                className="max-w-full h-auto rounded-md my-2"
                loading="lazy"
                {...props}
              />
            )
          },
        }}
      >
        {sanitizedContent}
      </ReactMarkdown>
    </div>
  )
}