package com.prism.sinks;

import org.apache.flink.api.common.serialization.DeserializationSchema;
import org.apache.flink.api.common.typeinfo.TypeInformation;

import java.io.IOException;

/**
 * A simple DeserializationSchema that passes through raw bytes unchanged.
 * Used as the KafkaSource deserializer so that deserialization routing
 * (valid events vs DLQ) can be handled downstream by a ProcessFunction.
 */
public class RawBytesDeserializationSchema implements DeserializationSchema<byte[]> {

    private static final long serialVersionUID = 1L;

    @Override
    public byte[] deserialize(byte[] message) throws IOException {
        return message;
    }

    @Override
    public boolean isEndOfStream(byte[] nextElement) {
        return false;
    }

    @Override
    public TypeInformation<byte[]> getProducedType() {
        return TypeInformation.of(byte[].class);
    }
}
