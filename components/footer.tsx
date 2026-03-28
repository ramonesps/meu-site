export default function Footer() {
  return (
    <footer className="border-t border-gray-200 mt-auto">
      <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-gray-500">
          &copy; {new Date().getFullYear()} Ramon Sarchi
        </p>
        <div className="flex flex-wrap justify-center gap-5">
          <a
            href="https://www.linkedin.com/in/ramonsarchi/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            LinkedIn
          </a>
          <a
            href="https://x.com/ramonps"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Twitter / X
          </a>
          <a
            href="https://www.instagram.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Instagram
          </a>
          <a
            href="https://web.facebook.com/ramonplatini"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Facebook
          </a>
          <a
            href="mailto:ramonplatini@gmail.com"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Email
          </a>
        </div>
      </div>
    </footer>
  )
}
