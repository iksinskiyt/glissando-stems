#pragma once
#include <cstdint>
#include <vector>
class SilenceDetector{
public:
    SilenceDetector();
    auto begin() const {return _silences.begin();}
    auto end() const {return _silences.end();}
    void detect_silence(const int16_t* stem,uint32_t total_length);
private:
    int16_t _silence_threshold;
    uint32_t _silence_min_length;
    std::vector<std::pair<int32_t,int32_t>> _silences;
};