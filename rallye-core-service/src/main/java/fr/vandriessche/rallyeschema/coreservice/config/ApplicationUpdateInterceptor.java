package fr.vandriessche.rallyeschema.coreservice.config;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import fr.vandriessche.rallyeschema.coreservice.services.ApplicationUpdatePublisher;

@Component
public class ApplicationUpdateInterceptor implements HandlerInterceptor {
    @Autowired
    private ApplicationUpdatePublisher publisher;

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler,
            Exception exception) {
        if (exception != null || response.getStatus() >= 400 || !isMutation(request.getMethod())) return;
        String path = request.getRequestURI();
        publisher.publish(domain(path), path, request.getMethod());
    }

    private boolean isMutation(String method) {
        return "POST".equals(method) || "PUT".equals(method) || "PATCH".equals(method) || "DELETE".equals(method);
    }

    private String domain(String path) {
        if (path.contains("formRecognitionConfiguration")) return "CONFIGURATION";
        if (path.contains("submittedForm")) return "SUBMITTED_FORMS";
        if (path.contains("challengeResult") || path.contains("challengeResponse")) return "RESULTS";
        if (path.contains("team")) return "TEAMS";
        if (path.contains("challengeConfiguration") || path.contains("challengeGroup") || path.contains("formDesign")
                || path.contains("rallyConfiguration") || path.equals("/rally") || path.equals("/api/rally")
                || path.contains("sharing/configuration")) return "CONFIGURATION";
        if (path.contains("database")) return "DATABASE";
        if (path.contains("logFile")) return "LOGS";
        return "APPLICATION";
    }
}
