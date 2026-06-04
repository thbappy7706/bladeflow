<?php

if (!function_exists('bladeflow')) {
    function bladeflow(string $view, array $data = [])
    {
        $viewResponse = view($view, $data);

        if (request()->header('X-BladeFlow') !== 'true') {
            return $viewResponse;
        }

        $fullHtml = $viewResponse->render();

        $content = '';
        $start = strpos($fullHtml, 'data-bladeflow-content');
        if ($start !== false) {
            $openTag = strrpos(substr($fullHtml, 0, $start), '<');
            $tagNameMatch = [];
            preg_match('/<(\w+)\s[^>]*data-bladeflow-content/', substr($fullHtml, $openTag), $tagNameMatch);
            $tagName = $tagNameMatch[1] ?? 'div';
            $innerStart = strpos($fullHtml, '>', $start) + 1;
            $innerEnd = strrpos($fullHtml, '</' . $tagName . '>');
            if ($innerStart && $innerEnd) {
                $content = trim(substr($fullHtml, $innerStart, $innerEnd - $innerStart));
            }
        }

        preg_match_all('/<style(?![^>]*data-bladeflow-layout-style)[^>]*>.*?<\/style>/si', $fullHtml, $styleMatches);
        $style = implode("\n", $styleMatches[0] ?? []);

        preg_match_all('/<script(?![^>]*data-bladeflow-layout-script)(?![^>]*\bsrc=)[^>]*>.*?<\/script>/si', $fullHtml, $scriptMatches);
        $script = implode("\n", $scriptMatches[0] ?? []);

        preg_match('/<title>(.*?)<\/title>/si', $fullHtml, $titleMatch);
        $title = strip_tags($titleMatch[1] ?? config('app.name'));

        return response()->json([
            'title'   => $title,
            'style'   => $style,
            'content' => $content,
            'script'  => $script,
        ]);
    }
}
