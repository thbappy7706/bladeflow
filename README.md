# BladeFlow — by [Tanvir Hossen Bappy](https://github.com/thbappy7706)

By default, every link click in Laravel loads a full new page — HTML, CSS, JS, fonts, everything re-downloads. BladeFlow skips that. Only the content changes, the rest stays. Faster, smoother, no white flash between pages.

Most Laravel SPA solutions force you to either abandon Blade entirely (Inertia) or add jQuery (pjax). This package adds that same speed on top of your existing Blade views — no rewrite, nothing changes except how fast it feels.

---

## Quick Start

```bash
composer require thbappy7706/bladeflow
php artisan vendor:publish --tag=bladeflow-assets
```

> Add `/public/vendor` to your `.gitignore` to avoid committing published assets.

---

## Setup — `@extends` / `@section`

**1. Layout file**

Add `@bladeflowContent` to your content wrapper and `@bladeflowEngine` before `</body>`. Make sure `@yield('script')` comes after `@bladeflowEngine`.

```blade
<main @bladeflowContent>
    @yield('content')
</main>

@bladeflowEngine
@yield('script')
```

**2. Navigation links**

Add `@bladeflow` to links you want SPA navigation on. Links without `@bladeflow` do a normal full reload.

```blade
<a href="{{ route('home') }}" @bladeflow>Home</a>
<a href="{{ route('about') }}" @bladeflow>About</a>
<a href="{{ route('logout') }}">Logout</a>
```

**3. Controller**

```php
public function home()
{
    return bladeflow('pages.home');
}

public function about()
{
    return bladeflow('pages.about', compact('data'));
}
```

**4. Page views — no changes needed**

```blade
@extends('layouts.app')

@section('title', 'Home')

@section('style')
    <style>
        .hero { background: #1a3c6e; color: #fff; padding: 60px; }
    </style>
@endsection

@section('content')
    <div class="hero">
        <h1>Welcome</h1>
    </div>
@endsection

@section('script')
    <script>
        console.log('page loaded');
    </script>
@endsection
```

---

## Setup — `x-layout` components

**1. Layout component**

Add `@bladeflowContent` to your content wrapper and `@bladeflowEngine` before `</body>`.

```blade
<head>
    <style data-bladeflow-layout-style>
        /* global styles — marked so they aren't re-injected on navigation */
    </style>

    {{ $style ?? '' }}
</head>
<body>
    <main @bladeflowContent>
        {{ $slot }}
    </main>

    <script data-bladeflow-layout-script>
        /* global scripts — marked so they don't re-run on navigation */
    </script>

    @bladeflowEngine
    {{ $script ?? '' }}
</body>
```

**2. Navigation links** — same as above, add `@bladeflow`:

```blade
<a href="{{ route('home') }}" @bladeflow>Home</a>
<a href="{{ route('logout') }}">Logout</a>
```

**3. Controller** — same as above:

```php
public function home()
{
    return bladeflow('pages.home');
}
```

**4. Page views**

```blade
<x-app-layout title="Home">

    <x-slot:style>
        <style>
            .hero { background: #1a3c6e; color: #fff; padding: 60px; }
        </style>
    </x-slot:style>

    <div class="hero">
        <h1>Welcome</h1>
    </div>

    <x-slot:script>
        <script>
            console.log('page loaded');
        </script>
    </x-slot:script>

</x-app-layout>
```

---

## What works out of the box

- URL updates, back/forward button, refresh, direct links — all work
- Per-page styles and scripts load and unload on every navigation
- Session expiry redirects cleanly instead of breaking
- Hover prefetch — pages start loading before you even click
- Works with both `@extends` and `x-layout`

---

## Requirements

- PHP 8.1+
- Laravel 10, 11, or 12

---

## Contributing

Found a bug or want to improve something? PRs are welcome on [GitHub](https://github.com/thbappy7706/bladeflow).

---

## License

MIT — [Tanvir Hossen Bappy](https://github.com/thbappy7706)