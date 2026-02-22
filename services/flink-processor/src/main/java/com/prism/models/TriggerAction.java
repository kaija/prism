package com.prism.models;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.io.Serializable;
import java.util.Map;
import java.util.Objects;

/**
 * A configured action on a trigger rule.
 * Supported types: webhook, kafka_publish, notification, tag_profile, update_attribute.
 */
public class TriggerAction implements Serializable {

    private static final long serialVersionUID = 1L;

    private String type;
    private boolean enabled;
    private String url;
    private String topic;
    private Map<String, String> headers;

    @JsonProperty("payload_template")
    private String payloadTemplate;

    public TriggerAction() {}

    public TriggerAction(String type, boolean enabled, String url, String topic,
                         Map<String, String> headers, String payloadTemplate) {
        this.type = type;
        this.enabled = enabled;
        this.url = url;
        this.topic = topic;
        this.headers = headers;
        this.payloadTemplate = payloadTemplate;
    }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

    public String getTopic() { return topic; }
    public void setTopic(String topic) { this.topic = topic; }

    public Map<String, String> getHeaders() { return headers; }
    public void setHeaders(Map<String, String> headers) { this.headers = headers; }

    public String getPayloadTemplate() { return payloadTemplate; }
    public void setPayloadTemplate(String payloadTemplate) { this.payloadTemplate = payloadTemplate; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        TriggerAction that = (TriggerAction) o;
        return enabled == that.enabled
                && Objects.equals(type, that.type)
                && Objects.equals(url, that.url)
                && Objects.equals(topic, that.topic)
                && Objects.equals(headers, that.headers)
                && Objects.equals(payloadTemplate, that.payloadTemplate);
    }

    @Override
    public int hashCode() {
        return Objects.hash(type, enabled, url, topic, headers, payloadTemplate);
    }
}
