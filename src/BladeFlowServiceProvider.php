<?php

namespace Thbappy7706\BladeFlow;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Blade;

class BladeFlowServiceProvider extends ServiceProvider
{
    public function boot()
    {
        Blade::directive('bladeflow', function () {
            return 'data-bladeflow';
        });

        Blade::directive('bladeflowContent', function () {
            return 'data-bladeflow-content';
        });

        Blade::directive('bladeflowEngine', function () {
            $url = asset('vendor/bladeflow/bladeflow-engine.js');
            return "<?php echo '<script src=\"{$url}\" defer></script>'; ?>";
        });

        $this->publishes([
            __DIR__ . '/../resources/bladeflow-engine.js' => public_path('vendor/bladeflow/bladeflow-engine.js'),
        ], 'bladeflow-assets');
    }

    public function register() {}
}
