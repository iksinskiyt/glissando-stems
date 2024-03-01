#include<silence-detector.h>
#include<cstdlib>

SilenceDetector::SilenceDetector() 
    : _silence_threshold(400)
    , _silence_min_length(100000)
{}
void SilenceDetector::detect_silence(const int16_t* stem,uint32_t total_length)
{
    int32_t silence_start = 0;
    _silences.clear();   

    for (uint32_t sample = 0; sample < total_length; ++sample) {
        int32_t stem_sample = sample;
        bool is_silence = false;

        int16_t left = stem[2 * stem_sample];
        int16_t right = stem[2 * stem_sample + 1];

        is_silence = std::abs(left) < _silence_threshold 
                    && std::abs(right) < _silence_threshold;
        
        if (!is_silence) {
            int32_t silence_length = sample - silence_start;
            if (silence_length >= _silence_min_length) {
                _silences.push_back({silence_start,sample});
            }

            silence_start = sample + 1;
        }
    }

    int32_t silence_length = total_length - silence_start;
    if (silence_length >= _silence_min_length) {
        _silences.push_back({silence_start,total_length});
    }
}