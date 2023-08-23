#pragma once
#include <atomic>
#include <mutex>
#include <string>
#include <unordered_map>
#include <vector>


// Forward declarations
struct audio_chunk;


struct stem_info {
    uint32_t id;
    std::string path;
    uint32_t samples;
    uint32_t offset;
    double gain_db;
    double pan;
};

class StemManager {
public:
    StemManager();

    void render(uint32_t first_sample, audio_chunk& chunk);
    void update_stem_info(const std::vector<stem_info>& info);
private:
    struct StemEntry {
        stem_info info;
        std::mutex mutex;
        std::atomic_bool data_ready;
        std::atomic_bool deleted;
        std::atomic_bool error;
        std::string data_block;
        const int16_t* data;
        std::atomic<uint32_t> waveform_ordinal;
        std::string waveform_base64;
    };

    using StemEntryPtr = std::shared_ptr<StemEntry>;

    static const float SHORT_TO_FLOAT;

    std::mutex _mutex;
    std::unordered_map<uint32_t, StemEntryPtr> _stems;

    void erase_unused_stems(const std::vector<stem_info>& info);
    void update_or_add_stems(const std::vector<stem_info>& info);
    StemEntryPtr create_stem_from_info(const stem_info& info);

    void run_stem_processing(StemEntryPtr stem);
    void run_waveform_processing(StemEntryPtr stem);
    void process_stem(StemEntryPtr stem);
    bool decode_vorbis_stream(StemEntryPtr stem, const char* data, uint32_t data_size);
    void process_stem_waveform(StemEntryPtr stem);
};
