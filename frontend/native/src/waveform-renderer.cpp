#include <waveform-renderer.h>

#include <lodepng.h>
#include <algorithm>
#include <iostream>

#define SAMPLE_MAX 32767
#define SAMPLE_MIN -32768


WaveformRenderer::WaveformRenderer(SilenceDetector& detector)
    : WaveformRenderer(4096, 128,detector) {}

WaveformRenderer::WaveformRenderer(int width, int height,SilenceDetector& detector)
    : _output_width(width)
    , _output_height(height)
    , _color_red(255)
    , _color_green(255)
    , _color_blue(255)
    , _color_alpha(255)
    , _silence_alpha(128)
    , _silence_threshold(400)
    , _silence_min_length(100000)
    , _silence_detector(detector)
{
}

void WaveformRenderer::set_silence_alpha(uint8_t alpha)
{
    _silence_alpha = alpha;
}

uint8_t WaveformRenderer::silence_alpha() const
{
    return _silence_alpha;
}

void WaveformRenderer::set_waveform_color(uint8_t red, uint8_t green, uint8_t blue, uint8_t alpha)
{
    _color_red = red;
    _color_green = green;
    _color_blue = blue;
    _color_alpha = alpha;
}

uint8_t WaveformRenderer::waveform_color_red() const
{
    return _color_red;
}

uint8_t WaveformRenderer::waveform_color_green() const
{
    return _color_green;
}

uint8_t WaveformRenderer::waveform_color_blue() const
{
    return _color_blue;
}

uint8_t WaveformRenderer::waveform_color_alpha() const
{
    return _color_alpha;
}

void WaveformRenderer::set_silence_threshold(int16_t threshold)
{
    _silence_threshold = threshold;
}

int16_t WaveformRenderer::silence_threshold() const
{
    return _silence_threshold;
}

void WaveformRenderer::set_silence_min_length(uint32_t min_length_samples)
{
    _silence_min_length = min_length_samples;
}

uint32_t WaveformRenderer::silence_min_length() const
{   
    return _silence_min_length;
}

std::vector<uint8_t> WaveformRenderer::render_waveform_to_png(
    int32_t offset, uint32_t total_length, const int16_t* samples, uint32_t num_samples)
{
    auto image = std::make_unique<pixel[]>(_output_width * _output_height);
    for (int i = 0; i < _output_width * _output_height; ++i) {
        image[i].red = image[i].green = image[i].blue = image[i].alpha = 0;
    }

    process_waveform(image.get(), offset, total_length, samples, num_samples);
    process_silence(image.get(), offset, total_length, samples, num_samples);

    std::vector<uint8_t> png;
    lodepng::encode(png, reinterpret_cast<uint8_t*>(image.get()), _output_width, _output_height);
    return png;
}

void WaveformRenderer::process_waveform(pixel* image, int32_t offset, 
    uint32_t total_length, const int16_t* samples, uint32_t num_samples)
{
    uint32_t start_sample = 0;

    for (int x = 0; x < _output_width; ++x) {
        uint32_t end_sample = get_column_end_sample(x, total_length);
        auto [hi_peak, low_peak] = get_column_peaks(
            start_sample, end_sample, offset, samples, num_samples);

        int hi_peak_px = peak_to_pixel(hi_peak);
        int low_peak_px = peak_to_pixel(low_peak);

        // Draw waveform
        for (int y = hi_peak_px; y <= low_peak_px; ++y) {
            auto& pixel = image[y * _output_width + x];
            pixel.red = _color_red;
            pixel.green = _color_green;
            pixel.blue = _color_blue;
            pixel.alpha = _color_alpha;
        }

        start_sample = end_sample;
    }
}

void WaveformRenderer::process_silence(pixel* image, int32_t offset, 
    int32_t total_length, const int16_t* samples, int32_t num_samples)
{
    int current_column = 0;
    if(offset>=0){
        draw_silence(image,total_length,current_column,0,offset);
    }
    for (auto&& [start,end] : _silence_detector) {
        if(end + offset >= 0){
            draw_silence(image, total_length, 
                current_column, std::max(start+offset,0), end+offset);
        }
    }   
    if(total_length> num_samples+offset){
        draw_silence(image,total_length,current_column,std::max(num_samples+offset,0),total_length);
    }
}

void WaveformRenderer::draw_silence(pixel* image, uint32_t total_length, int& column, 
    uint32_t silence_start, uint32_t silence_end)
{
    uint32_t column_start = column <= 0 ? 0 : get_column_end_sample(column - 1, total_length);
    uint32_t column_end = get_column_end_sample(column, total_length);

    pixel over = { 0, 0, 0, _silence_alpha };

    while (column_end < silence_end) {
        if(column >= _output_width)
            break;
        if (silence_start <= column_start) {
            for (int y = 0; y < _output_height; ++y) {
                blend_pixel(image[y * _output_width + column], over);
            }
        }

        ++column;
        column_start = column_end;
        column_end = get_column_end_sample(column, total_length);
    }
}

void WaveformRenderer::blend_pixel(pixel& src, const pixel& over)
{
    // https://en.wikipedia.org/wiki/Alpha_compositing
    
    float over_alpha = over.alpha / 255.f;
    float src_alpha = src.alpha / 255.f;
    float alpha = over_alpha + src_alpha * (1.f - over_alpha);

    src.alpha = static_cast<uint8_t>(round(alpha * 255.f));
    src.red = (over.red * over_alpha + src.red * src_alpha * (1.f - over_alpha)) / alpha;
    src.green = (over.green * over_alpha + src.green * src_alpha * (1.f - over_alpha)) / alpha;
    src.blue = (over.blue * over_alpha + src.blue * src_alpha * (1.f - over_alpha)) / alpha;
}

std::pair<int16_t, int16_t> WaveformRenderer::get_column_peaks(uint32_t start_sample, 
    uint32_t end_sample, int32_t offset, const int16_t* samples, uint32_t num_samples)
{
    if (start_sample >= end_sample) {
        return std::make_pair(0, 0);
    }

    int16_t hi_peak = SAMPLE_MIN, low_peak = SAMPLE_MAX;
    for (uint32_t sample = start_sample; sample < end_sample; ++sample) {
        int32_t stem_sample = sample - offset;
        if (stem_sample < 0) continue;
        if (stem_sample >= static_cast<int32_t>(num_samples)) break;

        int16_t left = samples[2 * stem_sample];
        int16_t right = samples[2 * stem_sample + 1];
        
        hi_peak = std::max({ hi_peak, left, right });
        low_peak = std::min({ low_peak, left, right });
    }

    return std::make_pair(hi_peak, low_peak);
}

uint32_t WaveformRenderer::get_column_end_sample(int x, uint32_t total_length) const {
    double fraction = static_cast<double>(x + 1) / _output_width;
    return static_cast<uint32_t>(round(fraction * total_length));
}

int WaveformRenderer::peak_to_pixel(int16_t peak) const
{
    // XDDD off by one error (there was no [height - 1] cap) 
    // that caused heap armageddon and 7 hours of debugging
    
    return std::min(_output_height - 1,
        static_cast<int>(round((32767. - static_cast<double>(peak)) / 65535. * (_output_height))));
}

