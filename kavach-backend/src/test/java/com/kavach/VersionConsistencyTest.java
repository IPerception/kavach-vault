package com.kavach;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The app version is written by hand in several files, and Maven 3 requires a literal
 * parent version, so it cannot be derived. v1.3.0 shipped with package.json and both
 * child-pom parent refs still at 1.2.0:
 * <ul>
 *   <li>the update banner compares GitHub's latest tag with package.json's version, so
 *       every v1.3.0 user was told "1.3.0 is available";</li>
 *   <li>the child modules resolved a stale 1.2.0 parent from ~/.m2 instead of the root
 *       pom, so root-pom changes silently did not reach them.</li>
 * </ul>
 * This fails the build whenever they drift apart. The jpackage --app-version uses
 * ${project.version}, so it needs no check.
 */
class VersionConsistencyTest {

    /** Surefire runs with the module dir (kavach-backend) as the working directory. */
    private static final Path REPO_ROOT = Path.of("").toAbsolutePath().getParent();

    private static final Pattern VERSION = Pattern.compile("<version>([^<]+)</version>");
    private static final Pattern PARENT = Pattern.compile("<parent>(.*?)</parent>", Pattern.DOTALL);
    /** First "version" key in the file; npm always writes the top-level one first. */
    private static final Pattern JSON_VERSION = Pattern.compile("\"version\"\\s*:\\s*\"([^\"]+)\"");

    @ParameterizedTest
    @ValueSource(strings = {"kavach-backend/pom.xml", "kavach-frontend/pom.xml"})
    void childPomParentMatchesRootVersion(String pom) throws IOException {
        Matcher parent = PARENT.matcher(read(pom));
        assertThat(parent.find()).as("<parent> in %s", pom).isTrue();
        assertThat(firstVersion(parent.group(1))).as("parent version in %s", pom).isEqualTo(rootVersion());
    }

    @ParameterizedTest
    @ValueSource(strings = {"kavach-frontend/package.json", "kavach-frontend/package-lock.json"})
    void frontendManifestMatchesRootVersion(String manifest) throws IOException {
        Matcher m = JSON_VERSION.matcher(read(manifest));
        assertThat(m.find()).as("top-level version in %s", manifest).isTrue();
        assertThat(m.group(1)).as("version in %s", manifest).isEqualTo(rootVersion());
    }

    /** The project's own version: the first <version> after the Spring Boot <parent> block. */
    private static String rootVersion() throws IOException {
        String pom = read("pom.xml");
        return firstVersion(pom.substring(pom.indexOf("</parent>")));
    }

    private static String firstVersion(String xml) {
        Matcher m = VERSION.matcher(xml);
        assertThat(m.find()).as("<version> element").isTrue();
        return m.group(1).trim();
    }

    private static String read(String relative) throws IOException {
        return Files.readString(REPO_ROOT.resolve(relative));
    }
}
